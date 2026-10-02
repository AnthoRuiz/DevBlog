import asyncio
import hmac
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.config import settings
from app.db.session import get_db
from app.models.ai_writer import AIDraftRun
from app.models.post import Post, PostStatus, Section, Tag
from app.models.user import User
from app.schemas.post import AIDraftIngest, AIDraftSettingsUpdate, AIRegenerateRequest
from app.services import ai_writer, unsplash
from app.services.ai_features import estimate_reading_time_heuristic
from app.services.llm import configured_providers

router = APIRouter(tags=["AI drafts"])

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


@router.get("/admin/ai-drafts/status")
async def ai_drafts_status(current_admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Schedule, settings, pending count and the last runs, for the admin panel."""
    cfg = await ai_writer.get_settings(db)
    runs = (await db.execute(select(AIDraftRun).order_by(desc(AIDraftRun.started_at)).limit(10))).scalars().all()
    return {
        "enabled": cfg.enabled,
        "max_pending": cfg.max_pending,
        "sections": cfg.sections,
        "schedule_time": settings.AI_DRAFTS_TIME,
        "timezone": settings.AI_DRAFTS_TIMEZONE,
        "next_run_at": ai_writer.next_run_at().isoformat(),
        "pending": await ai_writer.pending_ai_drafts(db),
        "running": ai_writer.is_running(),
        "providers": configured_providers(),
        "unsplash_configured": unsplash.is_configured(),
        "recent_runs": [_run_read(r) for r in runs],
    }


@router.put("/admin/ai-drafts/settings")
async def update_ai_drafts_settings(
    body: AIDraftSettingsUpdate,
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
        # Mental Health is personal experience only and can never be drafted by AI
        cfg.sections = [s for s in dict.fromkeys(body.sections) if s in known and s != "mental-health"]
    await db.commit()
    return {"enabled": cfg.enabled, "max_pending": cfg.max_pending, "sections": cfg.sections}


@router.post("/admin/ai-drafts/run", status_code=status.HTTP_202_ACCEPTED)
async def run_ai_drafts_now(current_admin: User = Depends(get_current_admin)):
    """Generate drafts now (in the background; the admin panel polls /status)."""
    if ai_writer.is_running():
        raise HTTPException(status_code=409, detail="A generation is already running")
    _spawn(ai_writer.run_generation("manual"))
    return {"started": True}


@router.post("/admin/ai-drafts/{post_id}/regenerate", status_code=status.HTTP_202_ACCEPTED)
async def regenerate_ai_draft(
    post_id: uuid.UUID,
    body: AIRegenerateRequest,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Rewrite a pending AI draft following the editor's note (in the background)."""
    post = await db.get(Post, post_id)
    if not post or post.origin != "ai" or post.status != PostStatus.PENDING_REVIEW:
        raise HTTPException(status_code=404, detail="AI draft not found")
    if ai_writer.is_running():
        raise HTTPException(status_code=409, detail="A generation is already running")
    post.ai_meta = {**(post.ai_meta or {}), "regenerating": True, "regenerate_error": None}
    await db.commit()
    _spawn(ai_writer.regenerate(post.id, body.note.strip()))
    return {"started": True}


def require_ingest_key(x_api_key: str | None = Header(default=None)) -> None:
    """Runs before the body is validated: a disabled endpoint answers 404, a wrong key 401."""
    expected = (settings.AI_DRAFTS_API_KEY or "").strip()
    if not expected:
        raise HTTPException(status_code=404, detail="Not found")
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.post("/ai-drafts/ingest", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_ingest_key)])
async def ingest_ai_draft(body: AIDraftIngest, db: AsyncSession = Depends(get_db)):
    """Receive a draft from an external generator (disabled unless AI_DRAFTS_API_KEY is set)."""
    section = (await db.execute(select(Section).where(Section.slug == body.section_slug))).scalar_one_or_none()
    if not section or section.slug == "mental-health":
        raise HTTPException(status_code=400, detail="Unknown or excluded section")
    cfg = await ai_writer.get_settings(db)
    if await ai_writer.pending_ai_drafts(db) >= cfg.max_pending:
        raise HTTPException(status_code=429, detail="Too many AI drafts are waiting for review")

    writer = await ai_writer.ensure_writer(db)
    section_tags = (await db.execute(select(Tag).where(Tag.section_id == section.id))).scalars().all()
    by_name = {t.name.lower(): t for t in section_tags}
    sources = [s.model_dump() for s in body.sources]
    content = ai_writer._with_sources(body.content_markdown, body.language, sources)
    cover = await unsplash.find_cover(body.cover_query or "", set()) if body.cover_query else None
    post = Post(
        author_id=writer.id,
        section_id=section.id,
        slug=await ai_writer._unique_slug(db, body.title),
        title=body.title,
        language=body.language,
        summary=body.summary,
        content_markdown=content,
        cover_image_url=cover["url"] if cover else None,
        cover_credit=cover["credit"] if cover else None,
        reading_time_minutes=estimate_reading_time_heuristic(content),
        status=PostStatus.PENDING_REVIEW,
        origin="ai",
        ai_meta={
            "topic": body.title,
            "sources": sources,
            "editor_notes": body.editor_notes,
            "providers": {"research": "external", "writing": "external"},
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        tags=[by_name[t.lower()] for t in body.tags if t.lower() in by_name][:3],
    )
    db.add(post)
    await db.commit()
    return {"id": str(post.id), "slug": post.slug, "status": post.status.value}
