from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from slugify import slugify
from typing import Optional
import uuid
import os
import shutil
import math
from datetime import datetime, timezone

def calculate_reading_time(text: str | None) -> int:
    if not text or not text.strip():
        return 1
    words = len(text.strip().split())
    return max(1, math.ceil(words / 200))

from app.db.session import get_db
from app.models.post import Post, Tag, post_tags
from app.models.interaction import Upvote, Bookmark, Comment
from app.models.user import User
from app.schemas.post import (
    PostRead,
    PostDetailRead,
    PostCreate,
    PostUpdate,
    TagRead,
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
from app.api.deps import get_current_admin, get_current_user_optional, get_client_hash

router = APIRouter(prefix="/posts", tags=["Artículos"])

@router.get("", response_model=list[PostRead])
async def list_posts(
    tag: Optional[str] = Query(None, description="Filtrar por slug de tag"),
    q: Optional[str] = Query(None, description="Búsqueda por título o resumen"),
    sort: str = Query("recent", regex="^(recent|top_voted|trending)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Post).where(Post.is_published == True).options(selectinload(Post.tags))

    if tag:
        query = query.join(Post.tags).where(Tag.slug == tag)

    if q:
        search_filter = f"%{q}%"
        query = query.where((Post.title.ilike(search_filter)) | (Post.summary.ilike(search_filter)))

    if sort == "top_voted":
        query = query.order_by(desc(Post.upvotes_count), desc(Post.created_at))
    elif sort == "trending":
        query = query.order_by(desc(Post.upvotes_count * 2 + Post.views_count), desc(Post.created_at))
    else:
        query = query.order_by(desc(Post.published_at), desc(Post.created_at))

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()
    return [PostRead.model_validate(p) for p in posts]

@router.get("/tags/all", response_model=list[TagRead])
async def list_all_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.name))
    tags = result.scalars().all()
    return [TagRead.model_validate(t) for t in tags]

@router.post("/tags", response_model=TagRead)
async def create_tag(
    tag_in: TagCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    clean_name = tag_in.name.strip()
    clean_slug = slugify(clean_name)
    if not clean_slug:
        raise HTTPException(status_code=400, detail="Nombre de tag inválido")

    # Verificar si ya existe por nombre o slug
    existing = await db.execute(
        select(Tag).where((Tag.name.ilike(clean_name)) | (Tag.slug == clean_slug))
    )
    found = existing.scalar_one_or_none()
    if found:
        return TagRead.model_validate(found)

    tag_colors = ["#38bdf8", "#10b981", "#818cf8", "#06b6d4", "#f59e0b", "#ec4899", "#a855f7", "#14b8a6"]
    assigned_color = tag_in.color_hex if tag_in.color_hex and tag_in.color_hex != "#38bdf8" else tag_colors[abs(hash(clean_slug)) % len(tag_colors)]

    new_tag = Tag(name=clean_name, slug=clean_slug, color_hex=assigned_color)
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return TagRead.model_validate(new_tag)

@router.post("/ai-suggest-tags", response_model=TagSuggestResponse)
async def ai_suggest_tags(
    req: TagSuggestRequest,
    current_admin: User = Depends(get_current_admin),
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
    current_admin: User = Depends(get_current_admin),
):
    """
    Calcula el tiempo estimado de lectura en minutos mediante IA (Google Gemini),
    evaluando la densidad técnica (código, terminal, diagramas) y extensión.
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
    current_admin: User = Depends(get_current_admin)
):
    uploads_dir = "/app/uploads" if os.path.exists("/app/uploads") else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]:
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Usa JPG, PNG, WEBP, GIF o SVG.")

    filename = f"img_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(uploads_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/{filename}"}

@router.post("/ai-translate", response_model=PostTranslateResponse)
async def ai_translate_post(
    req: PostTranslateRequest,
    current_admin: User = Depends(get_current_admin),
):
    """
    Traduce título, resumen y markdown a uno de los idiomas soportados (es, en, pt, fr)
    utilizando Google Gemini AI mientras preserva bloques de código y estructura técnica.
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
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    post.views_count += 1
    await db.commit()
    await db.refresh(post)

    return PostDetailRead.model_validate(post)

@router.post("", response_model=PostDetailRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: PostCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
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
        author_id=current_admin.id,
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
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.tags), selectinload(Post.comments))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

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
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    await db.delete(post)
    await db.commit()
    return {"status": "success", "message": "Artículo eliminado correctamente", "id": str(post_id)}

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
async def create_comment(
    post_id: uuid.UUID,
    comment_in: CommentCreate,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    post_res = await db.execute(select(Post).where(Post.id == post_id))
    post = post_res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    author_name = current_user.full_name if current_user else (comment_in.author_name or "Dev Reader")
    user_id = current_user.id if current_user else None

    new_comment = Comment(
        post_id=post_id,
        user_id=user_id,
        author_name=author_name,
        content=comment_in.content,
        is_approved=True
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    return CommentRead.model_validate(new_comment)

@router.post("/{post_id}/upvote", response_model=UpvoteResponse)
async def toggle_upvote(
    post_id: uuid.UUID,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    post_res = await db.execute(select(Post).where(Post.id == post_id))
    post = post_res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

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
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

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
