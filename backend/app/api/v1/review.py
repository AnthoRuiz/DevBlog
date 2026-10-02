import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.post import Post, PostStatus
from app.models.user import User
from app.schemas.post import PostRead, PostReject, ReviewItem

router = APIRouter(prefix="/admin", tags=["Review"])


async def _get_post_or_404(db: AsyncSession, post_id: uuid.UUID) -> Post:
    post = (
        await db.execute(select(Post).where(Post.id == post_id).options(selectinload(Post.tags)))
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/review", response_model=list[ReviewItem])
async def review_queue(current_admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Posts waiting for review, oldest first. ADMIN only."""
    rows = await db.execute(
        select(Post, func.coalesce(User.full_name, User.email))
        .join(User, User.id == Post.author_id)
        .where(Post.status == PostStatus.PENDING_REVIEW)
        .options(selectinload(Post.tags))
        .order_by(Post.updated_at, Post.created_at)
    )
    return [
        ReviewItem(**PostRead.model_validate(post).model_dump(), author_name=author_name, ai_meta=post.ai_meta)
        for post, author_name in rows.all()
    ]


@router.get("/review/count")
async def review_count(current_admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Number of posts waiting for review, for the admin panel badge."""
    rows = dict(
        (await db.execute(
            select(Post.origin, func.count(Post.id)).where(Post.status == PostStatus.PENDING_REVIEW).group_by(Post.origin)
        )).all()
    )
    # pending: everything waiting (badge total); ai_pending: the AI drafts among them
    return {"pending": sum(rows.values()), "ai_pending": rows.get("ai", 0)}


MAX_FEATURED_PER_SECTION = 2


@router.post("/posts/{post_id}/feature", response_model=PostRead)
async def feature_post(
    post_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Feature a published post in its section (at most two per section). ADMIN only."""
    post = await _get_post_or_404(db, post_id)
    if post.status != PostStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Only published posts can be featured")
    if post.featured_at is None:
        featured_count = (
            await db.execute(
                select(func.count(Post.id)).where(Post.section_id == post.section_id, Post.featured_at.is_not(None))
            )
        ).scalar_one()
        if featured_count >= MAX_FEATURED_PER_SECTION:
            raise HTTPException(
                status_code=409,
                detail=f"This section already has {MAX_FEATURED_PER_SECTION} featured posts. Unfeature one first.",
            )
        post.featured_at = datetime.now(timezone.utc)
        await db.commit()
    return PostRead.model_validate(await _get_post_or_404(db, post_id))


@router.delete("/posts/{post_id}/feature", response_model=PostRead)
async def unfeature_post(
    post_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_post_or_404(db, post_id)
    post.featured_at = None
    await db.commit()
    return PostRead.model_validate(await _get_post_or_404(db, post_id))


@router.post("/posts/{post_id}/approve", response_model=PostRead)
async def approve_post(
    post_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_post_or_404(db, post_id)
    if post.status != PostStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Only posts waiting for review can be approved")
    post.status = PostStatus.PUBLISHED
    post.review_note = None
    if not post.published_at:
        post.published_at = datetime.now(timezone.utc)
    # Approving an AI draft publishes it as the admin's own post
    if post.origin == "ai":
        post.author_id = current_admin.id
    await db.commit()
    return PostRead.model_validate(await _get_post_or_404(db, post_id))


@router.post("/posts/{post_id}/reject", response_model=PostRead)
async def reject_post(
    post_id: uuid.UUID,
    body: PostReject,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send a post back to its author with a reason; they can edit it and submit it again."""
    post = await _get_post_or_404(db, post_id)
    if post.status != PostStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Only posts waiting for review can be rejected")
    post.status = PostStatus.REJECTED
    post.review_note = body.reason.strip()
    await db.commit()
    return PostRead.model_validate(await _get_post_or_404(db, post_id))
