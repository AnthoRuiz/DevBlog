"""Daily AI drafts.

Every day at AI_DRAFTS_TIME (AI_DRAFTS_TIMEZONE) the scheduler picks two different topics from the
eligible sections (Mental Health is never included), one written in English and one in Spanish
(randomly assigned). Each draft is researched with live web search, written in the owner's voice
with its sources appended, given an Unsplash cover, and saved as a pending_review post authored by
the AI Writer account. The admin edits it and approves it, which publishes it under the admin's name.
"""
import asyncio
import logging
import random
import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import httpx
from slugify import slugify
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.ai_writer import AIDraftRun, AIWriterSettings, DEFAULT_AI_SECTIONS
from app.models.post import Post, PostStatus, Section, Tag
from app.models.user import User, UserRole
from app.services import topic_feeds, unsplash
from app.services.ai_features import estimate_reading_time_heuristic
from app.services.llm import LLMUnavailable, generate_json, research_with_search

logger = logging.getLogger("devblog.ai_drafts")  # child of the app logger: reaches server.log

DRAFTS_PER_DAY = 2
RETRY_DELAY = timedelta(minutes=30)
# One generation at a time (scheduled, retry, manual or regenerate)
_lock = asyncio.Lock()

LANGUAGE_RULES = {
    "en": (
        "Write in English, casual and conversational, like explaining it to a friend who codes: always use contractions "
        "(it's, you're, don't), short sentences, everyday words."
    ),
    "es": (
        "Write in Spanish: neutral Latin American Spanish, casual and conversational, address the reader as \"tú\" "
        "(like talking to a friend who programs), keep English tool and product names. Natural everyday expressions in "
        "moderation (\"ojo con…\", \"la verdad es que…\", \"te cuento…\"); no heavy slang."
    ),
}

# Target reading time (minutes, as the blog computes it: ~180 words/min plus code and density)
MIN_READ, MAX_READ = 5, 10
TARGET_WORDS = "1000 to 1500 words"


# ── Schedule ──────────────────────────────────────────────────────────────────
def _tz() -> ZoneInfo:
    return ZoneInfo(settings.AI_DRAFTS_TIMEZONE)


def _run_time() -> time:
    hour, minute = (int(part) for part in settings.AI_DRAFTS_TIME.split(":", 1))
    return time(hour, minute)


def local_today() -> date:
    return datetime.now(_tz()).date()


def next_run_at(now: Optional[datetime] = None) -> datetime:
    """Next scheduled run as an aware datetime in the configured timezone."""
    now = (now or datetime.now(timezone.utc)).astimezone(_tz())
    candidate = datetime.combine(now.date(), _run_time(), tzinfo=_tz())
    return candidate if candidate > now else candidate + timedelta(days=1)


# ── Data helpers ──────────────────────────────────────────────────────────────
async def get_settings(db: AsyncSession) -> AIWriterSettings:
    row = await db.get(AIWriterSettings, 1)
    if row is None:
        row = AIWriterSettings(id=1, enabled=True, max_pending=6, sections=list(DEFAULT_AI_SECTIONS))
        db.add(row)
        await db.commit()
    return row


async def ensure_writer(db: AsyncSession) -> User:
    """The AI Writer account: an inactive creator without a password, so it can never sign in."""
    writer = (await db.execute(select(User).where(User.email == settings.AI_WRITER_EMAIL))).scalar_one_or_none()
    if writer is None:
        writer = User(
            email=settings.AI_WRITER_EMAIL,
            full_name="AI Writer",
            hashed_password=None,
            role=UserRole.CREATOR,
            is_trusted=False,
            is_active=False,
        )
        db.add(writer)
        await db.commit()
        await db.refresh(writer)
    return writer


async def pending_ai_drafts(db: AsyncSession) -> int:
    return (
        await db.execute(select(func.count(Post.id)).where(Post.origin == "ai", Post.status == PostStatus.PENDING_REVIEW))
    ).scalar_one()


async def _pick_sections(db: AsyncSession, cfg: AIWriterSettings, count: int) -> list[Section]:
    """Distinct sections, least recently drafted first (ties broken at random)."""
    allowed = [slug for slug in cfg.sections if slug != "mental-health"]
    sections = (await db.execute(select(Section).where(Section.slug.in_(allowed)))).scalars().all()
    if not sections:
        return []
    last = dict(
        (await db.execute(select(Post.section_id, func.max(Post.created_at)).where(Post.origin == "ai").group_by(Post.section_id))).all()
    )
    oldest = datetime.min.replace(tzinfo=timezone.utc)
    ranked = sorted(sections, key=lambda s: (last.get(s.id) or oldest, random.random()))
    picked = ranked[:count]
    while len(picked) < count:  # fewer eligible sections than drafts
        picked.append(random.choice(sections))
    return picked


async def _recent_titles(db: AsyncSession, section_id) -> list[str]:
    rows = await db.execute(select(Post.title).where(Post.section_id == section_id).order_by(desc(Post.created_at)).limit(40))
    return list(rows.scalars().all())


async def _unique_slug(db: AsyncSession, title: str) -> str:
    base = slugify(title)[:200] or "post"
    slug, counter = base, 1
    while (await db.execute(select(Post.id).where(Post.slug == slug))).scalar_one_or_none():
        counter += 1
        slug = f"{base}-{counter}"
    return slug


async def _verify_sources(sources: list[dict]) -> list[dict]:
    """Keep up to six distinct sources that actually open, with redirects resolved to the final URL."""
    seen: set[str] = set()
    verified: list[dict] = []
    async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (blog source check)"}) as client:
        for source in sources:
            if len(verified) >= 6:
                break
            try:
                resp = await client.get(source["url"])
            except httpx.HTTPError:
                continue
            final = str(resp.url).split("#")[0]
            if resp.status_code >= 400 or final in seen:
                continue
            seen.add(final)
            title = source["title"]
            # Grounding redirects only carry a domain as title: prefer the page's <title>
            if "." in title and " " not in title:
                match = re.search(r"<title[^>]*>(.*?)</title>", resp.text[:20000], re.S | re.I)
                if match and match.group(1).strip():
                    title = re.sub(r"\s+", " ", match.group(1)).strip()[:160]
            verified.append({"title": title, "url": final})
    return verified


# ── Research and writing ──────────────────────────────────────────────────────
def _research_prompt(section: Section, avoid: list[str]) -> str:
    avoid_list = "\n".join(f"- {t}" for t in avoid) or "- (none yet)"
    return f"""You are researching the next post for the blog of Anthony Ruiz, a software engineer in security who
builds and tests systems in his homelab. Readers: junior to mid-level engineers and the self-hosting community.

Section: {section.name} ({section.description}).

Use web search to find ONE specific, timely topic for this section (news, a release, a technique or a debate from
roughly the last 30 days) that these readers would find useful. It must clearly differ from these existing posts:
{avoid_list}

Never pick: internal details of any employer (including Amazon), politics, medical or mental-health advice, rumors.

Then write research notes in English: the topic, why it matters now, the key facts (numbers only when a source states
them), and practical angles for a hands-on engineer. Finish with exactly this format:

TOPIC: <one line>
SOURCES:
- <page title> | <url>
- <page title> | <url>
(3 to 6 sources you actually used)"""


WRITE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "content_markdown": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "unsplash_query": {"type": "string"},
        "editor_notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["title", "summary", "content_markdown", "tags", "unsplash_query", "editor_notes"],
}


def _write_prompt(section: Section, language: str, research: str, tag_names: list[str], note: Optional[str]) -> str:
    feedback = f"\nThe editor asked for a new version with this feedback: {note}\n" if note else ""
    return f"""Write a blog post draft for Anthony Ruiz's blog from the research notes below.

{LANGUAGE_RULES[language]}
Section: {section.name}.
{feedback}
Tone: this is a personal blog, not documentation. Casual and conversational, never formal: talk to the reader
directly, short paragraphs, plain words, a bit of personality and the occasional light aside. Still genuinely useful:
concrete steps, real examples, the "why" behind things. Brand book rules still apply: pragmatic and precise, first
person singular, active voice; no hype, clickbait, corporate or vague language; no emoji in headings. Tool names,
commands and config keys in `code`. Numbers always with units and only when the research states them.

Rules:
- The research describes OTHER people's work. Present it as such ("the author of X ported...", "the Postgres docs
  say..."), never as Anthony's: no "I built / I used / I tested / I measured" about anything in the research, not in
  the title, the summary or the body. First person is only for opinions and recommendations ("I would start with...").
- Never invent personal experiences, measurements or claims that Anthony did something. Where his own experience or
  a homelab test would make the post stronger, add a blockquote that starts with "> TODO:" saying what to add.
- Length: a 5 to 10 minute read, which means {TARGET_WORDS} of Markdown (count code blocks as slower to read, so
  use fewer words when there is code). Never longer than that. Start with a short intro paragraph (no H1), then
  "## " sections; code blocks or a short list when they help. Do not add a sources section (it is appended
  automatically).
- title: specific and plain, at most 90 characters. summary: one or two sentences, at most 280 characters.
- tags: 1 to 3, chosen only from: {", ".join(tag_names) or "(none)"}.
- unsplash_query: 2 to 4 English words describing a concrete, photographable scene for the cover (no text, no logos).
- editor_notes: 2 to 4 short notes for Anthony in Spanish: claims to double-check and ideas to make it his own.

Research notes:
{research}"""


async def _write(section: Section, language: str, research: str, tag_names: list[str], note: Optional[str] = None):
    """Write the draft; if it does not read in MIN_READ-MAX_READ minutes, ask once for a version that does."""
    async def attempt(extra_note: Optional[str]):
        return await generate_json(
            _write_prompt(section, language, research, tag_names, extra_note),
            WRITE_SCHEMA,
            task="ai_draft_write",
            max_tokens=8000,
            timeout=180,
            effort="medium",
            stream=True,
        )

    result = await attempt(note)
    minutes = estimate_reading_time_heuristic(result.data["content_markdown"])
    if MIN_READ <= minutes <= MAX_READ:
        return result
    direction = "longer: add depth, examples and practical detail" if minutes < MIN_READ else "shorter: cut repetition and side topics"
    length_note = (
        f"The previous version read in {minutes} minutes; it must read in {MIN_READ} to {MAX_READ} minutes "
        f"({TARGET_WORDS}). Make it {direction}."
    )
    logger.info(f"[AI drafts] draft read in {minutes} min; asking for a {MIN_READ}-{MAX_READ} minute version")
    try:
        retry = await attempt(f"{note}. {length_note}" if note else length_note)
    except LLMUnavailable:
        return result
    retry_minutes = estimate_reading_time_heuristic(retry.data["content_markdown"])
    # Keep whichever version is closer to the range
    def distance(m: int) -> int:
        return 0 if MIN_READ <= m <= MAX_READ else min(abs(m - MIN_READ), abs(m - MAX_READ))
    return retry if distance(retry_minutes) <= distance(minutes) else result


def _with_sources(markdown: str, language: str, sources: list[dict]) -> str:
    if not sources:
        return markdown
    heading = "Fuentes" if language == "es" else "Sources"
    links = "\n".join(f"- [{s['title']}]({s['url']})" for s in sources)
    return f"{markdown.rstrip()}\n\n## {heading}\n\n{links}\n"


async def create_draft(db: AsyncSession, writer: User, section: Section, language: str) -> Post:
    """Research, write and save one draft (pending review, authored by the AI Writer)."""
    avoid = await _recent_titles(db, section.id)
    try:
        research = await research_with_search(_research_prompt(section, avoid), task="ai_draft_research", timeout=150)
    except LLMUnavailable as e:
        # Web search needs a paid tier (Gemini) or a Claude key: research from free public feeds instead
        logger.info(f"[AI drafts] web search unavailable ({e.reason}); researching {section.slug} from public feeds")
        research = await topic_feeds.research_from_feeds(section, avoid)
    topic_match = re.search(r"^TOPIC:\s*(.+)$", research.text, re.M)
    sources = await _verify_sources(research.sources)

    section_tags = (await db.execute(select(Tag).where(Tag.section_id == section.id))).scalars().all()
    written = await _write(section, language, research.text, [t.name for t in section_tags])
    data = written.data
    by_name = {t.name.lower(): t for t in section_tags}
    tags = [by_name[name.lower()] for name in data["tags"] if name.lower() in by_name][:3]

    used_photos = set(
        (await db.execute(select(Post.cover_credit["id"].astext).where(Post.cover_credit.is_not(None)))).scalars().all()
    )
    cover = await unsplash.find_cover(data["unsplash_query"], used_photos)

    content = _with_sources(data["content_markdown"], language, sources)
    post = Post(
        author_id=writer.id,
        section_id=section.id,
        slug=await _unique_slug(db, data["title"]),
        title=data["title"][:255],
        language=language,
        summary=data["summary"][:500],
        content_markdown=content,
        cover_image_url=cover["url"] if cover else None,
        cover_credit=cover["credit"] if cover else None,
        reading_time_minutes=estimate_reading_time_heuristic(content),
        status=PostStatus.PENDING_REVIEW,
        origin="ai",
        ai_meta={
            "topic": topic_match.group(1).strip() if topic_match else data["title"],
            "research_notes": research.text,
            "sources": sources,
            "editor_notes": data["editor_notes"][:6],
            "unsplash_query": data["unsplash_query"],
            "providers": {"research": research.provider, "writing": written.provider},
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        tags=tags,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


# ── Runs ──────────────────────────────────────────────────────────────────────
def is_running() -> bool:
    return _lock.locked()


async def run_generation(trigger: str) -> Optional[AIDraftRun]:
    """One generation run. Returns None when a scheduled run already happened today."""
    async with _lock:
        async with AsyncSessionLocal() as db:
            run = AIDraftRun(run_date=local_today(), trigger=trigger, status="running", detail="", post_ids=[])
            db.add(run)
            try:
                await db.commit()
            except IntegrityError:
                # Unique index: today's scheduled run already exists (restart, another worker)
                await db.rollback()
                return None

            cfg = await get_settings(db)
            if trigger != "manual" and not cfg.enabled:
                return await _finish(db, run, "skipped", "Paused in the admin panel")
            capacity = cfg.max_pending - await pending_ai_drafts(db)
            count = min(DRAFTS_PER_DAY, capacity)
            if count <= 0:
                return await _finish(db, run, "skipped", f"{cfg.max_pending} AI drafts are already waiting for review")

            writer = await ensure_writer(db)
            sections = await _pick_sections(db, cfg, count)
            if not sections:
                return await _finish(db, run, "skipped", "No eligible sections")
            # Two different topics, one English and one Spanish, in random order
            languages = random.sample(["en", "es"], k=count) if count <= 2 else [random.choice(["en", "es"]) for _ in range(count)]

            created, errors = [], []
            plan = [(section.id, section.slug, language) for section, language in zip(sections, languages)]
            for section_id, slug, language in plan:
                # Each draft gets its own session, so one failure cannot affect the other draft or the run log
                try:
                    async with AsyncSessionLocal() as draft_db:
                        post = await create_draft(
                            draft_db, await draft_db.get(User, writer.id), await draft_db.get(Section, section_id), language
                        )
                    created.append(str(post.id))
                    logger.info(f"[AI drafts] {trigger}: '{post.title}' ({slug}, {language})")
                except LLMUnavailable as e:
                    errors.append(f"{slug}/{language}: {e.reason}: {e}")
                except Exception as e:
                    errors.append(f"{slug}/{language}: {type(e).__name__}: {e}")
            run.post_ids = created
            status = "succeeded" if not errors else ("partial" if created else "failed")
            detail = "; ".join(errors) if errors else f"{len(created)} draft(s) created"
            if errors:
                logger.warning(f"[AI drafts] {trigger} run {status}: {detail}")
            return await _finish(db, run, status, detail)


async def _finish(db: AsyncSession, run: AIDraftRun, status: str, detail: str) -> AIDraftRun:
    run.status = status
    run.detail = detail[:2000]
    run.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)
    return run


async def regenerate(post_id, note: str) -> None:
    """Rewrite a pending AI draft from its stored research, following the editor's note."""
    async with _lock:
        async with AsyncSessionLocal() as db:
            post = await db.get(Post, post_id)
            if not post or post.origin != "ai" or not post.ai_meta:
                return
            meta = dict(post.ai_meta)
            try:
                section = await db.get(Section, post.section_id)
                section_tags = (await db.execute(select(Tag).where(Tag.section_id == section.id))).scalars().all()
                written = await _write(section, post.language, meta.get("research_notes", ""), [t.name for t in section_tags], note)
                data = written.data
                post.title = data["title"][:255]
                post.summary = data["summary"][:500]
                post.content_markdown = _with_sources(data["content_markdown"], post.language, meta.get("sources", []))
                post.reading_time_minutes = estimate_reading_time_heuristic(post.content_markdown)
                meta.update(editor_notes=data["editor_notes"][:6], last_feedback=note, regenerating=False, regenerate_error=None)
                meta["providers"] = {**meta.get("providers", {}), "writing": written.provider}
            except Exception as e:
                meta.update(regenerating=False, regenerate_error=f"{type(e).__name__}: {e}"[:300])
                logger.warning(f"[AI drafts] regenerate failed for {post_id}: {e}")
            post.ai_meta = meta
            await db.commit()


# ── Scheduler ─────────────────────────────────────────────────────────────────
async def _scheduled_run_exists(day: date) -> bool:
    async with AsyncSessionLocal() as db:
        return bool(
            (await db.execute(select(AIDraftRun.id).where(AIDraftRun.run_date == day, AIDraftRun.trigger == "schedule"))).first()
        )


async def _run_with_retry() -> None:
    run = await run_generation("schedule")
    if run and run.status == "failed":
        await asyncio.sleep(RETRY_DELAY.total_seconds())
        await run_generation("retry")


async def scheduler() -> None:
    """Background task started with the app: catch up on a missed run today, then run daily."""
    logger.info(f"[AI drafts] scheduler started; next run at {next_run_at().isoformat()}")
    try:
        now = datetime.now(_tz())
        if now.time() >= _run_time() and not await _scheduled_run_exists(now.date()):
            logger.info("[AI drafts] today's run was missed (app was down): running it now")
            await _run_with_retry()
    except asyncio.CancelledError:
        raise
    except Exception as e:
        logger.error(f"[AI drafts] catch-up run failed: {type(e).__name__}: {e}")
    while True:
        try:
            wait = (next_run_at() - datetime.now(timezone.utc)).total_seconds()
            await asyncio.sleep(max(wait, 1))
            await _run_with_retry()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            # Never let the daily loop die: log and wait for the next day
            logger.error(f"[AI drafts] run failed: {type(e).__name__}: {e}")
            await asyncio.sleep(60)
