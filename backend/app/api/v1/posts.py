from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from slugify import slugify
from typing import Optional
import uuid
import math
import re
from datetime import datetime, timezone

def calculate_reading_time(text: str | None) -> int:
    if not text or not text.strip():
        return 1
    words = len(text.strip().split())
    return max(1, math.ceil(words / 200))

from app.db.session import get_db
from app.models.post import Post, Tag, Section, post_tags
from app.models.interaction import Upvote, Bookmark, Comment
from app.models.user import User, UserRole
from app.schemas.post import (
    PostRead,
    PostPage,
    PostDetailRead,
    PostCreate,
    PostUpdate,
    TagRead,
    TagValidateRequest,
    TagValidateResponse,
    SectionRead,
    UpvoteResponse,
    CommentRead,
    CommentCreate,
    BookmarkToggleResponse,
    PostTranslateRequest,
    PostTranslateResponse,
    TagCreate,
    TagSuggestRequest,
    TagSuggestResponse,
)
from app.services.gemini import translate_post_content, suggest_post_tags, estimate_reading_time
from app.services import media_service, tag_classifier
from app.api.deps import get_current_admin, get_current_author_or_admin, get_current_user_optional, get_client_hash
from app.core.limiter import limiter

router = APIRouter(prefix="/posts", tags=["Posts"])

async def _get_section_or_400(db: AsyncSession, section_id: uuid.UUID) -> Section:
    section = await db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=400, detail="Unknown section")
    return section

@router.get("", response_model=PostPage)
async def list_posts(
    section: Optional[str] = Query(None, description="Filter by section slug"),
    tag: Optional[str] = Query(None, description="Filter by tag slug"),
    q: Optional[str] = Query(None, description="Search by title or summary"),
    sort: str = Query("recent", regex="^(recent|top_voted|trending)$"),
    limit: int = Query(12, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Post).where(Post.is_published == True)

    if section:
        query = query.join(Post.section).where(Section.slug == section)

    if tag:
        query = query.join(Post.tags).where(Tag.slug == tag)

    if q:
        search_filter = f"%{q}%"
        query = query.where((Post.title.ilike(search_filter)) | (Post.summary.ilike(search_filter)))

    # Total for the same filters, so the client knows whether there is another page
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    query = query.options(selectinload(Post.tags))

    if sort == "top_voted":
        query = query.order_by(desc(Post.upvotes_count), desc(Post.created_at))
    elif sort == "trending":
        query = query.order_by(desc(Post.upvotes_count * 2 + Post.views_count), desc(Post.created_at))
    else:
        query = query.order_by(desc(Post.published_at), desc(Post.created_at))

    # Post.id as a final tie-breaker keeps page boundaries stable when sort keys are equal
    query = query.order_by(desc(Post.id)).offset(offset).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()
    return PostPage(
        items=[PostRead.model_validate(p) for p in posts],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(posts) < total,
    )

@router.get("/tags/all", response_model=list[TagRead])
async def list_all_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.name))
    tags = result.scalars().all()
    return [TagRead.model_validate(t) for t in tags]

@router.post("/tags", response_model=TagRead)
async def create_tag(
    tag_in: TagCreate,
    current_user: User = Depends(get_current_author_or_admin),
    db: AsyncSession = Depends(get_db)
):
    clean_name = tag_in.name.strip()
    clean_slug = slugify(clean_name)
    if not clean_slug:
        raise HTTPException(status_code=400, detail="Invalid tag name")

    # Check whether it already exists by name or slug
    existing = await db.execute(
        select(Tag).where((Tag.name.ilike(clean_name)) | (Tag.slug == clean_slug))
    )
    found = existing.scalar_one_or_none()
    if found:
        return TagRead.model_validate(found)

    tag_colors = ["#38bdf8", "#10b981", "#818cf8", "#06b6d4", "#f59e0b", "#ec4899", "#a855f7", "#14b8a6"]
    assigned_color = tag_in.color_hex if tag_in.color_hex and tag_in.color_hex != "#38bdf8" else tag_colors[abs(hash(clean_slug)) % len(tag_colors)]

    # Reject tags that clearly belong to another section (e.g. "WoW" in Tech & Coding)
    section = await _get_section_or_400(db, tag_in.section_id)
    all_sections = (await db.execute(select(Section).order_by(Section.sort_order))).scalars().all()
    verdict = await tag_classifier.classify_tag(clean_name, all_sections)
    admin_override = tag_in.force and current_user.role == UserRole.ADMIN
    if tag_classifier.blocks(verdict, section.slug) and not admin_override:
        suggested = next(s for s in all_sections if s.slug == verdict.section_slug)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'"{clean_name}" looks like a {suggested.name} tag, not {section.name}. Create it in {suggested.name} instead.',
        )

    new_tag = Tag(name=clean_name, slug=clean_slug, color_hex=assigned_color, section_id=tag_in.section_id)
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return TagRead.model_validate(new_tag)

@router.post("/tags/validate", response_model=TagValidateResponse)
@limiter.limit("30/minute")
async def validate_tag_section(
    request: Request,
    body: TagValidateRequest,
    current_user: User = Depends(get_current_author_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Check, while the author types, whether a new tag name fits the selected section.
    Uses Gemini when configured, otherwise a keyword classifier.
    """
    name = body.name.strip()
    section = await _get_section_or_400(db, body.section_id)
    existing = (
        await db.execute(select(Tag).where((Tag.name.ilike(name)) | (Tag.slug == slugify(name))))
    ).scalar_one_or_none()
    all_sections = (await db.execute(select(Section).order_by(Section.sort_order))).scalars().all()
    verdict = await tag_classifier.classify_tag(name, all_sections)
    suggested = next((s for s in all_sections if s.slug == verdict.section_slug), None)
    return TagValidateResponse(
        name=name,
        existing_tag=TagRead.model_validate(existing) if existing else None,
        suggested_section=SectionRead.model_validate(suggested) if suggested else None,
        matches_selected=suggested is None or suggested.id == section.id,
        blocked=tag_classifier.blocks(verdict, section.slug),
        confidence=verdict.confidence,
        reason=verdict.reason,
        source=verdict.source,
    )

@router.post("/ai-suggest-tags", response_model=TagSuggestResponse)
@limiter.limit("10/minute")
async def ai_suggest_tags(
    request: Request,
    req: TagSuggestRequest,
    current_user: User = Depends(get_current_author_or_admin),
    db: AsyncSession = Depends(get_db)
):
    res_tags = await db.execute(select(Tag.name))
    existing_tag_names = list(res_tags.scalars().all())

    suggestions = await suggest_post_tags(
        title=req.title,
        summary=req.summary or "",
        content_markdown=req.content_markdown or "",
        existing_tags=existing_tag_names
    )
    return TagSuggestResponse(suggested_tags=suggestions)

@router.post("/ai-estimate-reading-time")
async def ai_estimate_reading_time(
    req: TagSuggestRequest,
    current_user: User = Depends(get_current_author_or_admin),
):
    """
    Estimate reading time in minutes with AI (Google Gemini), weighing
    technical density (code, terminal, diagrams) and length.
    """
    minutes = await estimate_reading_time(
        title=req.title,
        summary=req.summary or "",
        content_markdown=req.content_markdown or ""
    )
    return {"reading_time_minutes": minutes}

@router.get("/bookmarks/mine", response_model=list[PostRead])
async def list_my_bookmarks(
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    client_hash = get_client_hash(request)
    if current_user:
        query = (
            select(Post)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .where(Bookmark.user_id == current_user.id, Post.is_published == True)
            .options(selectinload(Post.tags))
            .order_by(desc(Bookmark.created_at))
        )
    else:
        query = (
            select(Post)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .where(Bookmark.client_hash == client_hash, Post.is_published == True)
            .options(selectinload(Post.tags))
            .order_by(desc(Bookmark.created_at))
        )
    result = await db.execute(query)
    posts = result.scalars().all()
    return [PostRead.model_validate(p) for p in posts]

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_author_or_admin)
):
    # Read at most the largest limit + 1 byte to detect oversized files without loading them fully
    data = await file.read(media_service.MAX_UPLOAD_BYTES + 1)

    # The extension comes from the actual content, not the client-supplied filename.
    # SVG is not allowed: it can carry JavaScript and would be served from our own origin.
    ext = media_service.detect_image_ext(data)
    if not ext:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use JPG, PNG, WEBP or GIF.")

    limit = media_service.max_bytes_for(ext)
    if len(data) > limit:
        kind = "GIF" if ext == ".gif" else "Image"
        raise HTTPException(status_code=413, detail=f"{kind} exceeds the {limit // media_service.MB} MB limit.")

    return {"url": media_service.save_image(data, ext)}

@router.post("/ai-translate", response_model=PostTranslateResponse)
@limiter.limit("10/minute")
async def ai_translate_post(
    request: Request,
    req: PostTranslateRequest,
    current_user: User = Depends(get_current_author_or_admin),
):
    """
    Translate title, summary and markdown into a supported language (es, en, pt, fr)
    with Google Gemini AI, preserving code blocks and technical structure.
    """
    res = await translate_post_content(
        title=req.title,
        summary=req.summary,
        content_markdown=req.content_markdown,
        target_lang=req.target_lang,
        source_lang=req.source_lang or "es"
    )
    return PostTranslateResponse(**res)

@router.get("/{slug}", response_model=PostDetailRead)
async def get_post_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Post)
        .where(Post.slug == slug, Post.is_published == True)
        .options(selectinload(Post.tags), selectinload(Post.comments))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.views_count += 1
    await db.commit()
    await db.refresh(post)

    return PostDetailRead.model_validate(post)

@router.post("", response_model=PostDetailRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_author_or_admin),
    db: AsyncSession = Depends(get_db)
):
    await _get_section_or_400(db, post_in.section_id)

    base_slug = slugify(post_in.title)
    slug = base_slug
    counter = 1

    while True:
        existing = await db.execute(select(Post).where(Post.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    tags = []
    if post_in.tag_ids:
        tag_res = await db.execute(select(Tag).where(Tag.id.in_(post_in.tag_ids)))
        tags = list(tag_res.scalars().all())

    reading_time = post_in.reading_time_minutes
    if not reading_time or reading_time <= 0:
        reading_time = await estimate_reading_time(post_in.title, post_in.summary, post_in.content_markdown)

    new_post = Post(
        author_id=current_user.id,
        section_id=post_in.section_id,
        slug=slug,
        title=post_in.title,
        language=post_in.language,
        summary=post_in.summary,
        content_markdown=post_in.content_markdown,
        cover_image_url=post_in.cover_image_url,
        reading_time_minutes=reading_time,
        is_published=post_in.is_published,
        published_at=datetime.now(timezone.utc) if post_in.is_published else None,
        tags=tags
    )
    db.add(new_post)
    await db.commit()
    res = await db.execute(
        select(Post).where(Post.id == new_post.id).options(selectinload(Post.tags), selectinload(Post.comments))
    )
    loaded_post = res.scalar_one()
    return PostDetailRead.model_validate(loaded_post)

@router.put("/{post_id}", response_model=PostDetailRead)
async def update_post(
    post_id: uuid.UUID,
    post_update: PostUpdate,
    current_user: User = Depends(get_current_author_or_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.tags), selectinload(Post.comments))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # RBAC check: only ADMIN or the post's original author
    if current_user.role != UserRole.ADMIN and post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: only the original author or an admin can edit this post"
        )

    if post_update.title is not None and post_update.title != post.title:
        post.title = post_update.title
        base_slug = slugify(post_update.title)
        slug = base_slug
        counter = 1
        while True:
            existing = await db.execute(select(Post).where(Post.slug == slug, Post.id != post_id))
            if not existing.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        post.slug = slug

    if post_update.section_id is not None:
        # Assign the object too: the already-loaded relationship would otherwise keep the old section
        post.section = await _get_section_or_400(db, post_update.section_id)
    if post_update.summary is not None:
        post.summary = post_update.summary
    if post_update.content_markdown is not None:
        post.content_markdown = post_update.content_markdown
    if post_update.cover_image_url is not None:
        post.cover_image_url = post_update.cover_image_url
    if post_update.reading_time_minutes is not None:
        post.reading_time_minutes = post_update.reading_time_minutes
    elif post_update.content_markdown is not None or post_update.title is not None:
        curr_title = post_update.title or post.title
        curr_summary = post_update.summary or post.summary
        curr_content = post_update.content_markdown if post_update.content_markdown is not None else post.content_markdown
        post.reading_time_minutes = await estimate_reading_time(curr_title, curr_summary, curr_content)
    if post_update.language is not None:
        post.language = post_update.language
    if post_update.is_published is not None:
        post.is_published = post_update.is_published
        if post.is_published and not post.published_at:
            post.published_at = datetime.now(timezone.utc)

    if post_update.tag_ids is not None:
        tag_res = await db.execute(select(Tag).where(Tag.id.in_(post_update.tag_ids)))
        post.tags = list(tag_res.scalars().all())

    await db.commit()
    res = await db.execute(
        select(Post).where(Post.id == post.id).options(selectinload(Post.tags), selectinload(Post.comments))
    )
    loaded_post = res.scalar_one()
    return PostDetailRead.model_validate(loaded_post)

@router.delete("/{post_id}")
async def delete_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_author_or_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # RBAC check: only ADMIN or the post's original author
    if current_user.role != UserRole.ADMIN and post.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions: only the original author or an admin can delete this post"
        )

    await db.delete(post)
    await db.commit()
    return {"status": "success", "message": "Post deleted successfully", "id": str(post_id)}

@router.get("/{post_id}/comments", response_model=list[CommentRead])
async def list_comments(post_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment)
        .where(Comment.post_id == post_id, Comment.is_approved == True)
        .order_by(desc(Comment.created_at))
    )
    comments = result.scalars().all()
    return [CommentRead.model_validate(c) for c in comments]

@router.post("/{post_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_comment(
    post_id: uuid.UUID,
    request: Request,
    comment_in: CommentCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    post_res = await db.execute(select(Post).where(Post.id == post_id))
    post = post_res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Anti-spam: honeypot field against bots
    if comment_in.hp_website:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request blocked by anti-spam filter"
        )

    # Strip script/iframe injections from the content
    sanitized = re.sub(r'<\s*script[^>]*>.*?<\s*/\s*script\s*>', '', comment_in.content, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'<\s*iframe[^>]*>.*?<\s*/\s*iframe\s*>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    if not sanitized.strip():
        raise HTTPException(status_code=400, detail="Invalid comment content")

    author_name = current_user.full_name if current_user else (comment_in.author_name or "Dev Reader")
    user_id = current_user.id if current_user else None

    new_comment = Comment(
        post_id=post_id,
        user_id=user_id,
        author_name=author_name,
        content=sanitized.strip(),
        is_approved=True
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    return CommentRead.model_validate(new_comment)

@router.post("/{post_id}/upvote", response_model=UpvoteResponse)
@limiter.limit("30/minute")
async def toggle_upvote(
    post_id: uuid.UUID,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    post_res = await db.execute(select(Post).where(Post.id == post_id))
    post = post_res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    client_hash = get_client_hash(request)

    if current_user:
        upvote_res = await db.execute(
            select(Upvote).where(Upvote.post_id == post_id, Upvote.user_id == current_user.id)
        )
    else:
        upvote_res = await db.execute(
            select(Upvote).where(Upvote.post_id == post_id, Upvote.client_hash == client_hash)
        )
    existing_upvote = upvote_res.scalar_one_or_none()

    if existing_upvote:
        await db.delete(existing_upvote)
        post.upvotes_count = max(0, post.upvotes_count - 1)
        upvoted = False
    else:
        new_upvote = Upvote(
            post_id=post_id,
            user_id=current_user.id if current_user else None,
            client_hash=client_hash if not current_user else None
        )
        db.add(new_upvote)
        post.upvotes_count += 1
        upvoted = True

    await db.commit()
    await db.refresh(post)
    return UpvoteResponse(post_id=post.id, upvoted=upvoted, new_upvotes_count=post.upvotes_count)

@router.post("/{post_id}/bookmark", response_model=BookmarkToggleResponse)
async def toggle_bookmark(
    post_id: uuid.UUID,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    post_res = await db.execute(select(Post).where(Post.id == post_id))
    post = post_res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    client_hash = get_client_hash(request)

    if current_user:
        bookmark_res = await db.execute(
            select(Bookmark).where(Bookmark.post_id == post_id, Bookmark.user_id == current_user.id)
        )
    else:
        bookmark_res = await db.execute(
            select(Bookmark).where(Bookmark.post_id == post_id, Bookmark.client_hash == client_hash)
        )
    existing_bm = bookmark_res.scalar_one_or_none()

    if existing_bm:
        await db.delete(existing_bm)
        is_bookmarked = False
    else:
        new_bm = Bookmark(
            post_id=post_id,
            user_id=current_user.id if current_user else None,
            client_hash=client_hash if not current_user else None
        )
        db.add(new_bm)
        is_bookmarked = True

    await db.commit()
    return BookmarkToggleResponse(post_id=post.id, is_bookmarked=is_bookmarked)
