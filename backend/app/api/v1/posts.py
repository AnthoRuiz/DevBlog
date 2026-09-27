from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from slugify import slugify
from typing import Optional
import uuid
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.post import Post, Tag, post_tags
from app.models.interaction import Upvote
from app.models.user import User
from app.schemas.post import PostRead, PostDetailRead, PostCreate, TagRead, UpvoteResponse
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
        # Trending: combinación ponderada de upvotes y views
        query = query.order_by(desc(Post.upvotes_count * 2 + Post.views_count), desc(Post.created_at))
    else:
        query = query.order_by(desc(Post.published_at), desc(Post.created_at))

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()
    return [PostRead.model_validate(p) for p in posts]

@router.get("/{slug}", response_model=PostDetailRead)
async def get_post_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Post)
        .where(Post.slug == slug, Post.is_published == True)
        .options(selectinload(Post.tags))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    # Incrementar vistas
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
    
    # Asegurar slug único
    while True:
        existing = await db.execute(select(Post).where(Post.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Obtener tags
    tags = []
    if post_in.tag_ids:
        tag_res = await db.execute(select(Tag).where(Tag.id.in_(post_in.tag_ids)))
        tags = list(tag_res.scalars().all())

    new_post = Post(
        author_id=current_admin.id,
        slug=slug,
        title=post_in.title,
        summary=post_in.summary,
        content_markdown=post_in.content_markdown,
        cover_image_url=post_in.cover_image_url,
        reading_time_minutes=post_in.reading_time_minutes,
        is_published=post_in.is_published,
        published_at=datetime.now(timezone.utc) if post_in.is_published else None,
        tags=tags
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)
    return PostDetailRead.model_validate(new_post)

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

    # Buscar voto existente
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
        # Retirar voto (toggle off)
        await db.delete(existing_upvote)
        post.upvotes_count = max(0, post.upvotes_count - 1)
        upvoted = False
    else:
        # Registrar voto (toggle on)
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

@router.get("/tags/all", response_model=list[TagRead])
async def list_all_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).order_by(Tag.name))
    tags = result.scalars().all()
    return [TagRead.model_validate(t) for t in tags]
