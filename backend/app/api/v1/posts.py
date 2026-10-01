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
from app.models.post import Post, PostStatus, Tag, Section, post_tags
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
    AIStatusResponse,
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
from app.services.ai_features import (
    translate_post_content,
    suggest_post_tags,
    estimate_reading_time,
    estimate_reading_time_heuristic,
)
from app.services.llm import LLMUnavailable, configured_providers
from app.services import media_service, tag_classifier
from app.core import quotas
from app.services import series_service
from app.api.deps import get_current_admin, get_current_creator_or_admin, get_current_user_optional, get_client_hash
from app.core.limiter import limiter

router = APIRouter(prefix="/posts", tags=["Posts"])

def _search_tsquery(q: str | None):
    """Prefix tsquery from the words in q ('docker comp' -> docker:* & comp:*), or None when q has no words.

    Only word characters reach to_tsquery, so user input cannot inject tsquery operators.
    """
    words = re.findall(r"\w+", (q or "").lower())[:8]
    # One-letter words in the middle of a query add noise; the last word is kept because the
    # reader may still be typing it
    words = [w for i, w in enumerate(words) if len(w) > 1 or i == len(words) - 1]
    if not words:
        return None
    return func.to_tsquery("simple", " & ".join(f"{w}:*" for w in words))


def _can_publish_directly(user: User) -> bool:
    """Admins and trusted creators publish directly; other creators go through review."""
    return user.role == UserRole.ADMIN or user.is_trusted


def _submitted_status(user: User) -> PostStatus:
    return PostStatus.PUBLISHED if _can_publish_directly(user) else PostStatus.PENDING_REVIEW


async def _get_public_post_or_404(db: AsyncSession, post_id: uuid.UUID) -> Post:
    """Readers can only interact (comment, upvote, bookmark) with published posts."""
    post = (await db.execute(select(Post).where(Post.id == post_id, Post.status == PostStatus.PUBLISHED))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


async def _get_section_or_400(db: AsyncSession, section_id: uuid.UUID) -> Section:
    section = await db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=400, detail="Unknown section")
    return section

@router.get("", response_model=PostPage)
async def list_posts(
    section: Optional[str] = Query(None, description="Filter by section slug"),
    tag: Optional[str] = Query(None, description="Filter by tag slug"),
    featured: Optional[bool] = Query(None, description="Only featured posts (true) or only the rest (false)"),
    q: Optional[str] = Query(None, max_length=200, description="Full-text search over title, summary and content"),
    sort: str = Query("recent", regex="^(recent|top_voted|trending|relevance)$"),
    limit: int = Query(12, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Post).where(Post.status == PostStatus.PUBLISHED)

    if section:
        query = query.join(Post.section).where(Section.slug == section)

    if tag:
        query = query.join(Post.tags).where(Tag.slug == tag)

    if featured is True:
        query = query.where(Post.featured_at.is_not(None))
    elif featured is False:
        query = query.where(Post.featured_at.is_(None))

    rank = None
    ts_query = _search_tsquery(q)
    if ts_query is not None:
        # Full-text match (prefix-aware, so results appear while typing); ILIKE on the title
        # also catches spellings the simple configuration does not normalize (accents, hyphens)
        match = Post.search_vector.op("@@")(ts_query)
        if len(q.strip()) >= 3:
            match = match | Post.title.ilike(f"%{q.strip()}%")
        query = query.where(match)
        rank = func.ts_rank_cd(Post.search_vector, ts_query)
    elif q and q.strip():
        search_filter = f"%{q.strip()}%"
        query = query.where((Post.title.ilike(search_filter)) | (Post.summary.ilike(search_filter)))

    # Total for the same filters, so the client knows whether there is another page
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    query = query.options(selectinload(Post.tags))

    if featured:
        query = query.order_by(desc(Post.featured_at))
    elif sort == "relevance" and rank is not None:
        query = query.order_by(desc(rank), desc(Post.published_at))
    elif sort == "top_voted":
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

@router.get("/ai-status", response_model=AIStatusResponse)
async def ai_status(current_user: User = Depends(get_current_creator_or_admin)):
    """Which AI providers are configured (the editor disables AI-only features when none)."""
    providers = configured_providers()
    return AIStatusResponse(available=bool(providers), providers=providers)

@router.get("/tags/all", response_model=list[TagRead])
async def list_all_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.name))
    tags = result.scalars().all()
    return [TagRead.model_validate(t) for t in tags]

@router.post("/tags", response_model=TagRead)
async def create_tag(
    tag_in: TagCreate,
    current_user: User = Depends(get_current_creator_or_admin),
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
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Check, while the author types, whether a new tag name fits the selected section.
    Uses Gemini when configured, otherwise a keyword classifier.
    """
    quotas.consume(current_user, "tag_check")
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
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    quotas.consume(current_user, "ai")
    res_tags = await db.execute(select(Tag.name))
    existing_tag_names = list(res_tags.scalars().all())

    suggestions, provider, fallback_reason = await suggest_post_tags(
        title=req.title,
        summary=req.summary or "",
        content_markdown=req.content_markdown or "",
        existing_tags=existing_tag_names
    )
    return TagSuggestResponse(suggested_tags=suggestions, provider=provider, fallback_reason=fallback_reason)

@router.post("/ai-estimate-reading-time")
async def ai_estimate_reading_time(
    req: TagSuggestRequest,
    current_user: User = Depends(get_current_creator_or_admin),
):
    """
    Estimate reading time in minutes with AI (Claude/Gemini, heuristic fallback), weighing
    technical density (code, terminal, diagrams) and length.
    """
    quotas.consume(current_user, "ai")
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
            .where(Bookmark.user_id == current_user.id, Post.status == PostStatus.PUBLISHED)
            .options(selectinload(Post.tags))
            .order_by(desc(Bookmark.created_at))
        )
    else:
        query = (
            select(Post)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .where(Bookmark.client_hash == client_hash, Post.status == PostStatus.PUBLISHED)
            .options(selectinload(Post.tags))
            .order_by(desc(Bookmark.created_at))
        )
    result = await db.execute(query)
    posts = result.scalars().all()
    return [PostRead.model_validate(p) for p in posts]

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_creator_or_admin)
):
    quotas.consume(current_user, "upload")
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
    current_user: User = Depends(get_current_creator_or_admin),
):
    """
    Translate title, summary and markdown into a supported language (es, en, pt, fr)
    with an LLM (Claude/Gemini with failover), preserving code blocks and technical structure.
    There is no non-AI fallback: without a working provider this returns 503.
    """
    quotas.consume(current_user, "ai")
    try:
        res = await translate_post_content(
            title=req.title,
            summary=req.summary,
            content_markdown=req.content_markdown,
            target_lang=req.target_lang,
            source_lang=req.source_lang or "es"
        )
    except LLMUnavailable as e:
        quota = e.reason == "quota_exhausted"
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if quota else status.HTTP_503_SERVICE_UNAVAILABLE,
            # Structured so the frontend can show a localized message
            detail={"code": f"ai_{e.reason}", "message": f"AI translation is unavailable: {e}", "retry_after": e.retry_after},
            headers={"Retry-After": str(e.retry_after)} if quota and e.retry_after else None,
        )
    return PostTranslateResponse(**res)

@router.get("/mine", response_model=list[PostRead])
async def list_my_posts(
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Every post of the current user, whatever its status (drafts, in review, rejected, published)."""
    result = await db.execute(
        select(Post)
        .where(Post.author_id == current_user.id)
        .options(selectinload(Post.tags))
        .order_by(desc(Post.updated_at), desc(Post.created_at))
    )
    return [PostRead.model_validate(p) for p in result.scalars().all()]


@router.get("/{slug}", response_model=PostDetailRead)
async def get_post_by_slug(
    slug: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Post).where(Post.slug == slug).options(selectinload(Post.tags), selectinload(Post.comments))
    )
    post = result.scalar_one_or_none()
    # Unpublished posts are visible only to their author and admins (drafts, review, rejected)
    can_preview = current_user is not None and (current_user.role == UserRole.ADMIN or post and post.author_id == current_user.id)
    if not post or (post.status != PostStatus.PUBLISHED and not can_preview):
        raise HTTPException(status_code=404, detail="Post not found")

    if post.status == PostStatus.PUBLISHED:
        post.views_count += 1
        await db.commit()
        await db.refresh(post)

    detail = PostDetailRead.model_validate(post)
    detail.series = await series_service.series_info(db, post, include_unpublished=can_preview)
    return detail

@router.post("", response_model=PostDetailRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db)
):
    await _get_section_or_400(db, post_in.section_id)
    post_status = _submitted_status(current_user) if post_in.submit else PostStatus.DRAFT

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
        # Instant heuristic: publishing must not wait on a (possibly slow) LLM call
        reading_time = estimate_reading_time_heuristic(post_in.content_markdown)

    new_post = Post(
        author_id=current_user.id,
        section_id=post_in.section_id,
        slug=slug,
        title=post_in.title,
        language=post_in.language,
        summary=post_in.summary,
        content_markdown=post_in.content_markdown,
        cover_image_url=post_in.cover_image_url,
        content_notice=(post_in.content_notice or "").strip() or None,
        reading_time_minutes=reading_time,
        status=post_status,
        published_at=datetime.now(timezone.utc) if post_status == PostStatus.PUBLISHED else None,
        tags=tags
    )
    if post_in.series_id:
        await series_service.assign_post_to_series(db, new_post, post_in.series_id, current_user)
    db.add(new_post)
    await db.commit()
    res = await db.execute(
        select(Post).where(Post.id == new_post.id).options(selectinload(Post.tags), selectinload(Post.comments))
    )
    loaded_post = res.scalar_one()
    detail = PostDetailRead.model_validate(loaded_post)
    detail.series = await series_service.series_info(db, loaded_post, include_unpublished=True)
    return detail

@router.put("/{post_id}", response_model=PostDetailRead)
async def update_post(
    post_id: uuid.UUID,
    post_update: PostUpdate,
    current_user: User = Depends(get_current_creator_or_admin),
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
        new_section = await _get_section_or_400(db, post_update.section_id)
        if new_section.id != post.section_id:
            # Featured slots and series are per section: moving a post gives both up
            post.featured_at = None
            await series_service.assign_post_to_series(db, post, None, current_user)
        post.section = new_section
        post.section_id = new_section.id
    if "series_id" in post_update.model_fields_set:
        await series_service.assign_post_to_series(db, post, post_update.series_id, current_user)
    if post_update.summary is not None:
        post.summary = post_update.summary
    if post_update.content_markdown is not None:
        post.content_markdown = post_update.content_markdown
    if post_update.cover_image_url is not None:
        post.cover_image_url = post_update.cover_image_url
    if post_update.content_notice is not None:
        post.content_notice = post_update.content_notice.strip() or None
    if post_update.reading_time_minutes is not None:
        post.reading_time_minutes = post_update.reading_time_minutes
    elif post_update.content_markdown is not None or post_update.title is not None:
        curr_content = post_update.content_markdown if post_update.content_markdown is not None else post.content_markdown
        post.reading_time_minutes = estimate_reading_time_heuristic(curr_content)
    if post_update.language is not None:
        post.language = post_update.language
    content_changed = any(
        value is not None
        for value in (post_update.title, post_update.summary, post_update.content_markdown,
                      post_update.cover_image_url, post_update.content_notice, post_update.section_id,
                      post_update.tag_ids)
    )
    if post_update.submit is not None:
        post.status = _submitted_status(current_user) if post_update.submit else PostStatus.DRAFT
    elif content_changed and post.status == PostStatus.PUBLISHED and not _can_publish_directly(current_user):
        # An untrusted creator editing a live post sends it back to review
        post.status = PostStatus.PENDING_REVIEW
    if post.status == PostStatus.PUBLISHED:
        post.review_note = None
        if not post.published_at:
            post.published_at = datetime.now(timezone.utc)
    else:
        # Only live posts can be featured
        post.featured_at = None

    if post_update.tag_ids is not None:
        tag_res = await db.execute(select(Tag).where(Tag.id.in_(post_update.tag_ids)))
        post.tags = list(tag_res.scalars().all())

    await db.commit()
    res = await db.execute(
        select(Post).where(Post.id == post.id).options(selectinload(Post.tags), selectinload(Post.comments))
    )
    loaded_post = res.scalar_one()
    detail = PostDetailRead.model_validate(loaded_post)
    detail.series = await series_service.series_info(db, loaded_post, include_unpublished=True)
    return detail

@router.delete("/{post_id}")
async def delete_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_creator_or_admin),
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
    post = await _get_public_post_or_404(db, post_id)

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
    post = await _get_public_post_or_404(db, post_id)

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
    post = await _get_public_post_or_404(db, post_id)

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
