import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_creator_or_admin, get_current_user_optional
from app.db.session import get_db
from app.models.post import Post, PostStatus, Section, Series
from app.models.user import User, UserRole
from app.schemas.post import PostRead, SeriesCreate, SeriesDetail, SeriesOrder, SeriesRead, SeriesUpdate
from app.services.series_service import can_manage_series

router = APIRouter(prefix="/series", tags=["Series"])


async def _unique_slug(db: AsyncSession, title: str, exclude_id: uuid.UUID | None = None) -> str:
    base = slugify(title) or "series"
    slug, counter = base, 1
    while True:
        query = select(Series.id).where(Series.slug == slug)
        if exclude_id:
            query = query.where(Series.id != exclude_id)
        if not (await db.execute(query)).scalar_one_or_none():
            return slug
        counter += 1
        slug = f"{base}-{counter}"


async def _get_series_or_404(db: AsyncSession, series_id: uuid.UUID) -> Series:
    # populate_existing: reload fresh values (and the section) after a commit expired the object
    series = (
        await db.execute(
            select(Series)
            .where(Series.id == series_id)
            .options(selectinload(Series.section))
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    return series


def _require_manage(user: User, series: Series) -> None:
    if not can_manage_series(user, series):
        raise HTTPException(status_code=403, detail="You can only manage your own series")


def _read(series: Series, post_count: int) -> SeriesRead:
    return SeriesRead.model_validate(series).model_copy(update={"post_count": post_count})


@router.get("", response_model=list[SeriesRead])
async def list_series(
    section: str | None = Query(None, description="Filter by section slug"),
    db: AsyncSession = Depends(get_db),
):
    """Series with at least one published post, most recently updated first."""
    published = (
        select(Post.series_id, func.count(Post.id).label("n"))
        .where(Post.status == PostStatus.PUBLISHED, Post.series_id.is_not(None))
        .group_by(Post.series_id)
        .subquery()
    )
    query = select(Series, published.c.n).join(published, published.c.series_id == Series.id)
    if section:
        query = query.join(Section, Section.id == Series.section_id).where(Section.slug == section)
    rows = await db.execute(query.order_by(Series.updated_at.desc()))
    return [_read(series, n) for series, n in rows.all()]


@router.get("/mine", response_model=list[SeriesRead])
async def my_series(
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Series the user can add posts to (all of them for admins), with their total post count."""
    counts = (
        select(Post.series_id, func.count(Post.id).label("n"))
        .where(Post.series_id.is_not(None))
        .group_by(Post.series_id)
        .subquery()
    )
    query = select(Series, func.coalesce(counts.c.n, 0)).outerjoin(counts, counts.c.series_id == Series.id)
    if current_user.role != UserRole.ADMIN:
        query = query.where(Series.created_by == current_user.id)
    rows = await db.execute(query.order_by(Series.title))
    return [_read(series, n) for series, n in rows.all()]


@router.get("/{slug}", response_model=SeriesDetail)
async def get_series(
    slug: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """The series with its posts in order. Readers see published posts; its owner and admins see all."""
    series = (
        await db.execute(
            select(Series).where(Series.slug == slug).options(selectinload(Series.section)).execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    can_edit = can_manage_series(current_user, series)
    query = select(Post).where(Post.series_id == series.id).options(selectinload(Post.tags))
    if not can_edit:
        query = query.where(Post.status == PostStatus.PUBLISHED)
    posts = (await db.execute(query.order_by(Post.series_position, Post.created_at))).scalars().all()
    if not posts and not can_edit:
        raise HTTPException(status_code=404, detail="Series not found")
    return SeriesDetail(
        **_read(series, len(posts)).model_dump(),
        posts=[PostRead.model_validate(p) for p in posts],
        can_edit=can_edit,
    )


@router.post("", response_model=SeriesRead, status_code=201)
async def create_series(
    body: SeriesCreate,
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db),
):
    if not await db.get(Section, body.section_id):
        raise HTTPException(status_code=400, detail="Section not found")
    series = Series(
        title=body.title.strip(),
        slug=await _unique_slug(db, body.title),
        description=body.description.strip(),
        section_id=body.section_id,
        cover_image_url=body.cover_image_url,
        created_by=current_user.id,
    )
    db.add(series)
    await db.commit()
    return _read(await _get_series_or_404(db, series.id), 0)


@router.put("/{series_id}", response_model=SeriesRead)
async def update_series(
    series_id: uuid.UUID,
    body: SeriesUpdate,
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db),
):
    series = await _get_series_or_404(db, series_id)
    _require_manage(current_user, series)
    post_count = (await db.execute(select(func.count(Post.id)).where(Post.series_id == series.id))).scalar_one()
    if body.title is not None and body.title.strip() != series.title:
        series.title = body.title.strip()
        series.slug = await _unique_slug(db, series.title, exclude_id=series.id)
    if body.description is not None:
        series.description = body.description.strip()
    if body.cover_image_url is not None:
        series.cover_image_url = body.cover_image_url or None
    if body.section_id is not None and body.section_id != series.section_id:
        if post_count:
            raise HTTPException(status_code=400, detail="Move or remove the series' posts before changing its section")
        if not await db.get(Section, body.section_id):
            raise HTTPException(status_code=400, detail="Section not found")
        series.section_id = body.section_id
    await db.commit()
    return _read(await _get_series_or_404(db, series_id), post_count)


@router.put("/{series_id}/order", response_model=SeriesDetail)
async def reorder_series(
    series_id: uuid.UUID,
    body: SeriesOrder,
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Set the order of every post in the series (post_ids lists all of them, first to last)."""
    series = await _get_series_or_404(db, series_id)
    _require_manage(current_user, series)
    posts = (await db.execute(select(Post).where(Post.series_id == series.id))).scalars().all()
    by_id = {p.id: p for p in posts}
    if len(body.post_ids) != len(set(body.post_ids)) or set(body.post_ids) != set(by_id):
        raise HTTPException(status_code=400, detail="post_ids must list every post of the series exactly once")
    # The unique (series_id, series_position) constraint is deferred until commit
    for position, post_id in enumerate(body.post_ids, start=1):
        by_id[post_id].series_position = position
    slug = series.slug
    await db.commit()
    return await get_series(slug, current_user, db)


@router.delete("/{series_id}")
async def delete_series(
    series_id: uuid.UUID,
    current_user: User = Depends(get_current_creator_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete the series; its posts stay and simply leave the series."""
    series = await _get_series_or_404(db, series_id)
    _require_manage(current_user, series)
    posts = (await db.execute(select(Post).where(Post.series_id == series.id))).scalars().all()
    for post in posts:
        post.series_id = None
        post.series_position = None
    await db.delete(series)
    await db.commit()
    return {"deleted": True}
