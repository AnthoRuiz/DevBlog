import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.post import Post, Section
from app.models.user import User
from app.schemas.post import SectionRead, SectionUpdate, SectionWithCount

router = APIRouter(tags=["Sections"])


@router.get("/sections", response_model=list[SectionWithCount])
async def list_sections(db: AsyncSession = Depends(get_db)):
    """All sections in display order, with their number of published posts."""
    published = (
        select(Post.section_id, func.count(Post.id).label("post_count"))
        .where(Post.is_published == True)
        .group_by(Post.section_id)
        .subquery()
    )
    rows = await db.execute(
        select(Section, func.coalesce(published.c.post_count, 0))
        .outerjoin(published, published.c.section_id == Section.id)
        .order_by(Section.sort_order, Section.name)
    )
    return [
        SectionWithCount(**SectionRead.model_validate(section).model_dump(), post_count=count)
        for section, count in rows.all()
    ]


@router.put("/admin/sections/{section_id}", response_model=SectionRead)
async def update_section(
    section_id: uuid.UUID,
    section_in: SectionUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Edit a section's name, description or color. The slug stays fixed (it is used in URLs). ADMIN only."""
    section = await db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if section_in.name is not None and section_in.name.strip() != section.name:
        name = section_in.name.strip()
        taken = await db.execute(select(Section).where(func.lower(Section.name) == name.lower(), Section.id != section_id))
        if taken.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Another section already uses that name")
        section.name = name
    if section_in.description is not None:
        section.description = section_in.description.strip()
    if section_in.color_hex is not None:
        section.color_hex = section_in.color_hex.lower()

    await db.commit()
    await db.refresh(section)
    return SectionRead.model_validate(section)
