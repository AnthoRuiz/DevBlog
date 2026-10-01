"""Series membership rules shared by the posts and series endpoints."""
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post, PostStatus, Series
from app.models.user import User, UserRole
from app.schemas.post import PostSeriesInfo, SeriesNeighbor


def can_manage_series(user: User | None, series: Series) -> bool:
    """Creators manage the series they created; admins manage every series."""
    return user is not None and (user.role == UserRole.ADMIN or series.created_by == user.id)


async def assign_post_to_series(db: AsyncSession, post: Post, series_id: uuid.UUID | None, user: User) -> None:
    """Put the post at the end of a series (or take it out with None). The post's section must be set."""
    if series_id is None:
        post.series_id = None
        post.series_position = None
        return
    if post.series_id == series_id:
        return
    series = await db.get(Series, series_id)
    if not series:
        raise HTTPException(status_code=400, detail="Series not found")
    if not can_manage_series(user, series):
        raise HTTPException(status_code=403, detail="You can only add posts to your own series")
    if series.section_id != post.section_id:
        raise HTTPException(status_code=400, detail="The series belongs to another section")
    last = (await db.execute(select(func.max(Post.series_position)).where(Post.series_id == series_id))).scalar()
    post.series_id = series_id
    post.series_position = (last or 0) + 1


async def series_info(db: AsyncSession, post: Post, include_unpublished: bool) -> PostSeriesInfo | None:
    """'Part N of M' with previous/next links. Readers only count published posts."""
    if post.series_id is None:
        return None
    series = await db.get(Series, post.series_id)
    if not series:
        return None
    query = select(Post.id, Post.slug, Post.title).where(Post.series_id == series.id)
    if not include_unpublished:
        query = query.where(Post.status == PostStatus.PUBLISHED)
    rows = (await db.execute(query.order_by(Post.series_position, Post.created_at))).all()
    ids = [row.id for row in rows]
    if post.id not in ids:
        return None
    index = ids.index(post.id)
    prev_row = rows[index - 1] if index > 0 else None
    next_row = rows[index + 1] if index + 1 < len(rows) else None
    return PostSeriesInfo(
        id=series.id,
        slug=series.slug,
        title=series.title,
        position=index + 1,
        total=len(rows),
        prev=SeriesNeighbor(slug=prev_row.slug, title=prev_row.title) if prev_row else None,
        next=SeriesNeighbor(slug=next_row.slug, title=next_row.title) if next_row else None,
    )
