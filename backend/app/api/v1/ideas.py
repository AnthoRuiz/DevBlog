import asyncio
import hmac
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.config import settings
from app.db.session import get_db
from app.models.ai_writer import AIDraftRun
from app.models.idea import PostIdea
from app.models.post import Section, Tag
from app.models.user import User
from app.schemas.post import IdeaIngest, IdeaRead, IdeaSettingsUpdate
from app.services import ai_writer, unsplash
from app.services.llm import configured_providers

router = APIRouter(tags=["Writing ideas"])

# Background runs started from the admin panel (kept so they are not garbage-collected)
_tasks: set[asyncio.Task] = set()


def _spawn(coro) -> None:
    task = asyncio.create_task(coro)
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def _run_read(run: AIDraftRun) -> dict:
    return {
        "id": str(run.id),
        "run_date": run.run_date.isoformat(),
        "trigger": run.trigger,
        "status": run.status,
        "detail": run.detail,
        "post_ids": run.post_ids,
        "started_at": run.started_at.isoformat(),
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
    }


async def _idea_or_404(db: AsyncSession, idea_id: uuid.UUID) -> PostIdea:
    idea = await db.get(PostIdea, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


async def _read(db: AsyncSession, idea: PostIdea) -> IdeaRead:
    section = await db.get(Section, idea.section_id)
    brief = {k: v for k, v in (idea.brief or {}).items() if k != "research_notes"}
    return IdeaRead(
        id=idea.id,
        section_slug=section.slug if section else "",
        section_name=section.name if section else "",
        section_color=section.color_hex if section else "#22d3ee",
        language=idea.language,
        title=idea.title,
        hook=idea.hook,
        brief=brief,
        sources=idea.sources,
        cover_image_url=idea.cover_image_url,
        cover_credit=idea.cover_credit,
        status=idea.status,
        post_id=idea.post_id,
        created_at=idea.created_at,
    )


@router.get("/admin/ideas/status")
async def ideas_status(current_admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Schedule, settings, ideas waiting and the last runs, for the admin panel."""
    cfg = await ai_writer.get_settings(db)
    runs = (await db.execute(select(AIDraftRun).order_by(desc(AIDraftRun.started_at)).limit(10))).scalars().all()
    return {
        "enabled": cfg.enabled,
        "max_pending": cfg.max_pending,
        "sections": cfg.sections,
        "schedule_time": settings.AI_DRAFTS_TIME,
        "timezone": settings.AI_DRAFTS_TIMEZONE,
        "next_run_at": ai_writer.next_run_at().isoformat(),
        "pending": await ai_writer.pending_ideas(db),
        "running": ai_writer.is_running(),
        "providers": configured_providers(),
        "unsplash_configured": unsplash.is_configured(),
        "recent_runs": [_run_read(r) for r in runs],
    }


@router.put("/admin/ideas/settings")
async def update_ideas_settings(
    body: IdeaSettingsUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    cfg = await ai_writer.get_settings(db)
    if body.enabled is not None:
        cfg.enabled = body.enabled
    if body.max_pending is not None:
        cfg.max_pending = body.max_pending
    if body.sections is not None:
        known = set((await db.execute(select(Section.slug))).scalars().all())
        # Mental Health is personal experience only: no AI topics there
        cfg.sections = [s for s in dict.fromkeys(body.sections) if s in known and s != "mental-health"]
    await db.commit()
    return {"enabled": cfg.enabled, "max_pending": cfg.max_pending, "sections": cfg.sections}


@router.post("/admin/ideas/run", status_code=status.HTTP_202_ACCEPTED)
async def generate_ideas_now(current_admin: User = Depends(get_current_admin)):
    """Research new ideas now (in the background; the admin panel polls /status)."""
    if ai_writer.is_running():
        raise HTTPException(status_code=409, detail="A generation is already running")
    _spawn(ai_writer.run_generation("manual"))
    return {"started": True}


@router.get("/admin/ideas", response_model=list[IdeaRead])
async def list_ideas(
    status_filter: str = Query("new", alias="status", pattern="^(new|started|dismissed|all)$"),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(PostIdea).order_by(desc(PostIdea.created_at)).limit(50)
    if status_filter != "all":
        query = query.where(PostIdea.status == status_filter)
    return [await _read(db, idea) for idea in (await db.execute(query)).scalars().all()]


@router.post("/admin/ideas/{idea_id}/start")
async def start_writing(
    idea_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create the admin's own draft from the idea, with a guided template to write over."""
    idea = await _idea_or_404(db, idea_id)
    if idea.status == "started" and idea.post_id:
        raise HTTPException(status_code=409, detail="You already started writing this idea")
    post = await ai_writer.start_writing(db, idea, current_admin)
    return {"post_id": str(post.id), "slug": post.slug}


@router.post("/admin/ideas/{idea_id}/dismiss")
async def dismiss_idea(
    idea_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hide the idea (kept so the topic is not suggested again)."""
    idea = await _idea_or_404(db, idea_id)
    idea.status = "dismissed"
    await db.commit()
    return {"dismissed": True}


def require_ingest_key(x_api_key: str | None = Header(default=None)) -> None:
    """Runs before the body is validated: a disabled endpoint answers 404, a wrong key 401."""
    expected = (settings.AI_DRAFTS_API_KEY or "").strip()
    if not expected:
        raise HTTPException(status_code=404, detail="Not found")
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.post("/ideas/ingest", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_ingest_key)])
async def ingest_idea(body: IdeaIngest, db: AsyncSession = Depends(get_db)):
    """Receive an idea from an external generator (disabled unless AI_DRAFTS_API_KEY is set)."""
    section = (await db.execute(select(Section).where(Section.slug == body.section_slug))).scalar_one_or_none()
    if not section or section.slug == "mental-health":
        raise HTTPException(status_code=400, detail="Unknown or excluded section")
    cfg = await ai_writer.get_settings(db)
    if await ai_writer.pending_ideas(db) >= cfg.max_pending:
        raise HTTPException(status_code=429, detail="Too many ideas are waiting")
    tag_names = {t.name.lower(): t.name for t in (await db.execute(select(Tag).where(Tag.section_id == section.id))).scalars().all()}
    cover = await unsplash.find_cover(body.cover_query, set()) if body.cover_query else None
    idea = PostIdea(
        section_id=section.id,
        language=body.language,
        title=body.title,
        hook=body.hook,
        brief={
            "angles": body.angles,
            "outline": [o.model_dump() for o in body.outline],
            "questions": body.questions,
            "experiment": body.experiment,
            "tags": [tag_names[t.lower()] for t in body.tags if t.lower() in tag_names][:3],
            "providers": {"research": "external", "brief": "external"},
        },
        sources=[s.model_dump() for s in body.sources],
        cover_image_url=cover["url"] if cover else None,
        cover_credit=cover["credit"] if cover else None,
        status="new",
    )
    db.add(idea)
    await db.commit()
    return {"id": str(idea.id), "status": idea.status}
