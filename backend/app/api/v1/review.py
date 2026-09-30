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
        ReviewItem(**PostRead.model_validate(post).model_dump(), author_name=author_name)
        for post, author_name in rows.all()
    ]


@router.get("/review/count")
async def review_count(current_admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Number of posts waiting for review, for the admin panel badge."""
    count = (
        await db.execute(select(func.count(Post.id)).where(Post.status == PostStatus.PENDING_REVIEW))
    ).scalar_one()
    return {"pending": count}


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
