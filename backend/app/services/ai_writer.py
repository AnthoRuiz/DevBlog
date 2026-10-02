"""Daily writing ideas.

Every day at AI_DRAFTS_TIME (AI_DRAFTS_TIMEZONE) the scheduler picks two different topics from the
eligible sections, one meant to be written in English and one in Spanish (randomly assigned): one
from the owner's own work (the project's git history, exported to app/data/work_log.json) and one
timely topic that fits his writer profile (live web search, or free public feeds scored against the
profile). Each is saved as an idea card: why it matters now, angles, an outline with prompts, personal questions, a
homelab experiment, sources and an Unsplash cover. The AI never writes the post: "Start writing"
creates the admin's own draft with a guided template built from the card.
"""
import asyncio
import json
import logging
import random
import re
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
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
from app.models.idea import PostIdea
from app.models.post import Post, PostStatus, Section, Tag
from app.models.user import User
from app.services import topic_feeds, unsplash
from app.services.ai_features import estimate_reading_time_heuristic
from app.services.llm import LLMUnavailable, generate_json, research_with_search

logger = logging.getLogger("devblog.ai_ideas")  # child of the app logger: reaches server.log

IDEAS_PER_DAY = 2
RETRY_DELAY = timedelta(minutes=30)
# One generation at a time (scheduled, retry or manual)
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


async def pending_ideas(db: AsyncSession) -> int:
    """Ideas the admin has not started or dismissed yet."""
    return (await db.execute(select(func.count(PostIdea.id)).where(PostIdea.status == "new"))).scalar_one()


async def _pick_sections(db: AsyncSession, cfg: AIWriterSettings, count: int) -> list[Section]:
    """Up to `count` DIFFERENT sections, never the same one twice in a run: the section that went
    longest without an idea comes first (ties at random). With fewer eligible sections than `count`,
    fewer ideas are created that day rather than repeating a section."""
    allowed = list(cfg.sections)
    sections = (await db.execute(select(Section).where(Section.slug.in_(allowed)))).scalars().all()
    if not sections:
        return []
    last = dict((await db.execute(select(PostIdea.section_id, func.max(PostIdea.created_at)).group_by(PostIdea.section_id))).all())
    oldest = datetime.min.replace(tzinfo=timezone.utc)
    ranked = sorted(sections, key=lambda s: (last.get(s.id) or oldest, random.random()))
    return ranked[:count]


async def _recent_titles(db: AsyncSession, section_id) -> list[str]:
    """Titles to avoid repeating: recent posts and every idea already suggested (even dismissed ones)."""
    posts = await db.execute(select(Post.title).where(Post.section_id == section_id).order_by(desc(Post.created_at)).limit(30))
    ideas = await db.execute(select(PostIdea.title).where(PostIdea.section_id == section_id).order_by(desc(PostIdea.created_at)).limit(30))
    return list(posts.scalars().all()) + list(ideas.scalars().all())


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
def _research_prompt(section: Section, avoid: list[str], profile: str, feedback: str) -> str:
    avoid_list = "\n".join(f"- {t}" for t in avoid) or "- (none yet)"
    return f"""You are researching the next post for the blog of Anthony Ruiz, a software engineer in security who
builds and tests systems in his homelab. Readers: junior to mid-level engineers and the self-hosting community.

Section: {section.name} ({section.description}).

Use web search to find ONE specific, timely topic for this section (news, a release, a technique or a debate from
roughly the last 30 days) that these readers would find useful. It must clearly differ from these existing posts:
{avoid_list}

The topic must fit the writer's profile (what he knows or wants to learn):
{profile}

His reactions to past ideas (more like the liked ones, nothing like the others):
{feedback}

Never pick: internal details of any employer (including Amazon), politics, medical or mental-health advice, rumors.

Then write research notes in English: the topic, why it matters now, the key facts (numbers only when a source states
them), and practical angles for a hands-on engineer. Finish with exactly this format:

TOPIC: <one line>
SOURCES:
- <page title> | <url>
- <page title> | <url>
(3 to 6 sources you actually used)"""


IDEA_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "hook": {"type": "string"},
        "angles": {"type": "array", "items": {"type": "string"}},
        "outline": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "heading": {"type": "string"},
                    "guidance": {"type": "string"},
                    "prompts": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["heading", "guidance", "prompts"],
            },
        },
        "questions": {"type": "array", "items": {"type": "string"}},
        "experiment": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "unsplash_query": {"type": "string"},
    },
    "required": ["title", "hook", "angles", "outline", "questions", "experiment", "tags", "unsplash_query"],
}


def _idea_prompt(section: Section, language: str, research: str, tag_names: list[str], kind: str, profile: str) -> str:
    if kind == "experience":
        focus = (
            "The notes describe HIS OWN work on his blog and homelab. The outline's prompts must help him tell what he "
            "built, why, the decisions and trade-offs, what failed first and what he would measure; first person is right."
        )
    else:
        focus = (
            "The notes describe other people's news or work. Point the outline toward what HE can try, measure and give "
            "an opinion on; do not present other people's work as his."
        )
    return f"""You help Anthony Ruiz decide what to write next on his personal blog. He writes every post himself:
your job is NOT to write the post, only to turn the research notes below into an idea card and a writing outline
that guides his own thinking.

{LANGUAGE_RULES[language]} (Every field of the card is in that language.)
Section: {section.name}. Readers: junior to mid-level engineers and the homelab community.
His blog's promise: real setups with real numbers, run on his own hardware, including what failed first.
{focus}

His profile (stay within what he knows; topics he is learning are framed as learning in public):
{profile}

Return:
- title: a working title he could use or change, at most 90 characters, plain (no clickbait).
- hook: 2 or 3 sentences on why this topic matters right now, based on the research.
- angles: 3 to 5 different ways he could approach the post.
- outline: 4 to 6 sections for a 5 to 10 minute post. For each: heading, guidance (one or two sentences on what to
  cover), and 2 or 3 prompts (questions he answers from his own experience, setup or opinion).
- questions: 3 to 5 personal questions to get his own story out ("When did this bite you?", "What would you tell
  someone starting today?").
- experiment: one concrete homelab experiment he could run and measure for this post (or "" if none fits).
- tags: 1 to 3, chosen only from: {", ".join(tag_names) or "(none)"}.
- unsplash_query: 2 to 4 English words describing a concrete, photographable scene for the cover (no text, no logos).

Research notes:
{research}"""


# ── Writer profile and feedback ───────────────────────────────────────────────
def profile_text(cfg: AIWriterSettings) -> str:
    profile = cfg.profile or {}

    def bullet(key: str) -> str:
        return "\n".join(f"- {item}" for item in profile.get(key, [])) or "- (none)"

    return (
        f"Knows well and can write about from experience:\n{bullet('knows')}\n"
        f"Wants to learn (write as learning in public):\n{bullet('learning')}\n"
        f"Never suggest:\n{bullet('avoid')}\n"
        f"Notes: {profile.get('notes', '')}"
    )


async def feedback_text(db: AsyncSession) -> str:
    """The owner's last reactions to ideas, as examples for the next ones."""
    rows = (
        await db.execute(
            select(PostIdea.title, PostIdea.feedback).where(PostIdea.feedback.is_not(None)).order_by(desc(PostIdea.created_at)).limit(20)
        )
    ).all()
    labels = {"like": "liked", "unknown": "did not know the topic", "dislike": "not interested"}
    return "\n".join(f"- {labels.get(fb, fb)}: {title}" for title, fb in rows) or "- (no reactions yet)"


# ── Saving an idea ────────────────────────────────────────────────────────────
async def _save_idea(
    db: AsyncSession,
    section: Section,
    language: str,
    research_text: str,
    research_provider: str,
    sources: list[dict],
    kind: str,
    profile: str,
    extra: Optional[dict] = None,
) -> PostIdea:
    section_tags = (await db.execute(select(Tag).where(Tag.section_id == section.id))).scalars().all()
    result = await generate_json(
        _idea_prompt(section, language, research_text, [t.name for t in section_tags], kind, profile),
        IDEA_SCHEMA,
        task="ai_idea_brief",
        max_tokens=4000,
        timeout=150,
        effort="medium",
    )
    data = result.data
    valid_tags = {t.name.lower(): t.name for t in section_tags}
    used_photos = set(
        (await db.execute(select(PostIdea.cover_credit["id"].astext).where(PostIdea.cover_credit.is_not(None)))).scalars().all()
    ) | set((await db.execute(select(Post.cover_credit["id"].astext).where(Post.cover_credit.is_not(None)))).scalars().all())
    cover = await unsplash.find_cover(data["unsplash_query"], used_photos)
    idea = PostIdea(
        section_id=section.id,
        language=language,
        title=data["title"][:255],
        hook=data["hook"],
        brief={
            "kind": kind,
            "angles": data["angles"][:5],
            "outline": [
                {"heading": o["heading"], "guidance": o["guidance"], "prompts": o["prompts"][:3]} for o in data["outline"][:6]
            ],
            "questions": data["questions"][:5],
            "experiment": data["experiment"],
            "tags": [valid_tags[t.lower()] for t in data["tags"] if t.lower() in valid_tags][:3],
            "research_notes": research_text,
            "providers": {"research": research_provider, "brief": result.provider},
            **(extra or {}),
        },
        sources=sources,
        cover_image_url=cover["url"] if cover else None,
        cover_credit=cover["credit"] if cover else None,
        status="new",
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)
    return idea


async def create_trend_idea(db: AsyncSession, section: Section, language: str, profile: str, feedback: str) -> PostIdea:
    """A timely topic in this section that fits the writer profile (raises NoFittingTopic otherwise)."""
    avoid = await _recent_titles(db, section.id)
    try:
        research = await research_with_search(
            _research_prompt(section, avoid, profile, feedback), task="ai_idea_research", timeout=150
        )
    except LLMUnavailable as e:
        # Web search needs a paid tier (Gemini) or a Claude key: research from free public feeds instead
        logger.info(f"[AI ideas] web search unavailable ({e.reason}); researching {section.slug} from public feeds")
        research = await topic_feeds.research_from_feeds(section, avoid, profile, feedback)
    sources = await _verify_sources(research.sources)
    return await _save_idea(db, section, language, research.text, research.provider, sources, "trend", profile)


# ── Ideas from the owner's own work (git history of this project) ─────────────
WORK_LOG = Path(__file__).resolve().parent.parent / "data" / "work_log.json"
STORY_TYPES = ("feat", "fix", "refactor", "perf", "test")


class NoStory(Exception):
    """No usable work history (missing work log, or nothing new to tell)."""


def work_log() -> list[dict]:
    """Commits exported by scripts/export_work_log.sh (newest first), real changes only."""
    try:
        commits = json.loads(WORK_LOG.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [c for c in commits if re.split(r"[(:!]", c.get("subject", ""), maxsplit=1)[0] in STORY_TYPES]


STORY_SCHEMA = {
    "type": "object",
    "properties": {
        "section_slug": {"type": "string"},
        "commit_hashes": {"type": "array", "items": {"type": "string"}},
        "story": {"type": "string"},
        "angle": {"type": "string"},
    },
    "required": ["section_slug", "commit_hashes", "story", "angle"],
}


async def create_experience_idea(db: AsyncSession, sections: list[Section], language: str, profile: str, feedback: str) -> PostIdea:
    """Pick a story from what the owner built (his commits) and turn it into an idea in one of `sections`."""
    commits = work_log()
    used_rows = (await db.execute(select(PostIdea.brief["commits"]).where(PostIdea.brief.has_key("commits")))).scalars().all()
    used = {h for row in used_rows if isinstance(row, list) for h in row}
    fresh = [c for c in commits if c["hash"] not in used][:80]
    if not fresh or not sections:
        raise NoStory("no work history left to suggest")
    listing = "\n".join(f"- {c['hash']} {c['date']} {c['subject']}" + (f" :: {c['body'][:200]}" if c["body"] else "") for c in fresh)
    section_list = "\n".join(f"- {s.slug}: {s.name} ({s.description})" for s in sections)
    pick = await generate_json(
        f"""These are recent changes Anthony Ruiz made to his own blog and homelab (git commits, newest first):
{listing}

Pick ONE story worth a blog post for junior to mid-level engineers: a feature, migration, fix or refactor he did,
made of 1 to 6 related commits. It must fit one of these sections (answer with its slug):
{section_list}

His profile:
{profile}

His reactions to past ideas:
{feedback}

Prefer stories with a real decision, trade-off or failure behind them. Return the section slug, the commit hashes,
the story in 3 to 5 sentences and the most interesting angle.""",
        STORY_SCHEMA,
        task="ai_idea_story",
        max_tokens=1200,
        timeout=90,
    )
    data = pick.data
    by_slug = {s.slug: s for s in sections}
    section = by_slug.get(data["section_slug"]) or sections[0]
    chosen = [c for c in fresh if c["hash"] in set(data["commit_hashes"])][:6]
    if not chosen:
        raise NoStory("the model picked no valid commit")
    notes = "\n".join(f"- {c['date']} {c['subject']}\n  {c['body']}" for c in chosen)
    research = (
        f"THIS IS ANTHONY'S OWN WORK on his blog and homelab.\nStory: {data['story']}\nAngle: {data['angle']}\n"
        f"Commits:\n{notes}"
    )
    return await _save_idea(
        db, section, language, research, f"work-log+{pick.provider}", [], "experience", profile,
        extra={"commits": [c["hash"] for c in chosen]},
    )


# ── "Start writing": a guided template from an idea ────────────────────────────
TEMPLATE_TEXT = {
    "es": {
        "how": "**Cómo usar esta plantilla:** cada línea con ✍️ es una guía. Escribe debajo con tus palabras y bórrala cuando termines; si queda alguna al publicar, el editor te avisa.",
        "intro": "Introducción",
        "intro_hook": "Engancha al lector con por qué esto importa ahora:",
        "intro_you": "¿Qué te llamó la atención a ti? ¿Te pasó algo parecido?",
        "experiment": "Lo probé en mi homelab",
        "experiment_guide": "Experimento sugerido:",
        "experiment_notes": "Anota tu setup, los números que mediste y lo primero que falló.",
        "closing": "Lo que me llevo",
        "closing_guide": "Cierra con una recomendación concreta: ¿qué debería hacer el lector mañana?",
        "angles": "Ángulos posibles (elige uno):",
        "sources": "Fuentes",
    },
    "en": {
        "how": "**How to use this template:** every line with ✍️ is a prompt. Write below it in your own words and delete it when you're done; if any are left when you publish, the editor will warn you.",
        "intro": "Intro",
        "intro_hook": "Hook the reader with why this matters right now:",
        "intro_you": "What caught your attention? Has something similar happened to you?",
        "experiment": "Trying it in my homelab",
        "experiment_guide": "Suggested experiment:",
        "experiment_notes": "Write down your setup, the numbers you measured and what failed first.",
        "closing": "What I took away",
        "closing_guide": "Close with one concrete recommendation: what should the reader do tomorrow?",
        "angles": "Possible angles (pick one):",
        "sources": "Sources",
    },
}
GUIDE = "> ✍️"


def build_template(idea: PostIdea) -> str:
    """Markdown outline with ✍️ prompts for the admin to write over."""
    txt = TEMPLATE_TEXT.get(idea.language, TEMPLATE_TEXT["en"])
    brief = idea.brief or {}
    lines = [f"{GUIDE} {txt['how']}", ""]
    if brief.get("angles"):
        lines += [f"{GUIDE} {txt['angles']}"] + [f"{GUIDE} - {a}" for a in brief["angles"]] + [""]
    lines += [f"## {txt['intro']}", "", f"{GUIDE} {txt['intro_hook']} {idea.hook}", f"{GUIDE} {txt['intro_you']}", ""]
    for section in brief.get("outline", []):
        lines += [f"## {section['heading']}", "", f"{GUIDE} {section['guidance']}"]
        lines += [f"{GUIDE} {prompt}" for prompt in section.get("prompts", [])]
        lines.append("")
    if brief.get("experiment"):
        lines += [
            f"## {txt['experiment']}", "",
            f"{GUIDE} {txt['experiment_guide']} {brief['experiment']}",
            f"{GUIDE} {txt['experiment_notes']}", "",
        ]
    lines += [f"## {txt['closing']}", ""]
    lines += [f"{GUIDE} {q}" for q in brief.get("questions", [])]
    lines += [f"{GUIDE} {txt['closing_guide']}", ""]
    if idea.sources:
        lines += [f"## {txt['sources']}", ""] + [f"- [{s['title']}]({s['url']})" for s in idea.sources] + [""]
    return "\n".join(lines)


async def start_writing(db: AsyncSession, idea: PostIdea, author: User) -> Post:
    """Create the admin's own draft from an idea: working title, cover, tags and the guided template."""
    section_tags = (await db.execute(select(Tag).where(Tag.section_id == idea.section_id))).scalars().all()
    wanted = {t.lower() for t in (idea.brief or {}).get("tags", [])}
    content = build_template(idea)
    post = Post(
        author_id=author.id,
        section_id=idea.section_id,
        slug=await _unique_slug(db, idea.title),
        title=idea.title,
        language=idea.language,
        summary=idea.hook[:500],
        content_markdown=content,
        cover_image_url=idea.cover_image_url,
        cover_credit=idea.cover_credit,
        reading_time_minutes=estimate_reading_time_heuristic(content),
        status=PostStatus.DRAFT,
        origin="human",
        tags=[t for t in section_tags if t.name.lower() in wanted],
    )
    db.add(post)
    await db.flush()
    idea.status = "started"
    idea.post_id = post.id
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
            capacity = cfg.max_pending - await pending_ideas(db)
            count = min(IDEAS_PER_DAY, capacity)
            if count <= 0:
                return await _finish(db, run, "skipped", f"{cfg.max_pending} ideas are already waiting")

            ranked = await _pick_sections(db, cfg, len(cfg.sections))
            if not ranked:
                return await _finish(db, run, "skipped", "No eligible sections")
            profile = profile_text(cfg)
            feedback = await feedback_text(db)
            # One idea from his own work and one timely topic, in different sections and languages
            kinds = ["experience", "trend"] if work_log() else ["trend", "trend"]
            languages = random.sample(["en", "es"], k=2)
            section_ids = [s.id for s in ranked]

            created, errors, used_sections = [], [], set()
            for kind, language in list(zip(kinds, languages))[:count]:
                remaining = [sid for sid in section_ids if sid not in used_sections]
                if not remaining:
                    break
                # Each idea gets its own session, so one failure cannot affect the other or the run log
                try:
                    async with AsyncSessionLocal() as idea_db:
                        idea = await _create_one(idea_db, kind, remaining, language, profile, feedback)
                    used_sections.add(idea.section_id)
                    created.append(str(idea.id))
                    logger.info(f"[AI ideas] {trigger}: '{idea.title}' ({kind}, {language})")
                except LLMUnavailable as e:
                    errors.append(f"{kind}/{language}: {e.reason}: {e}")
                except Exception as e:
                    errors.append(f"{kind}/{language}: {type(e).__name__}: {e}")
            run.post_ids = created
            status = "succeeded" if not errors else ("partial" if created else "failed")
            detail = "; ".join(errors) if errors else f"{len(created)} idea(s) created"
            if errors:
                logger.warning(f"[AI ideas] {trigger} run {status}: {detail}")
            return await _finish(db, run, status, detail)


async def _create_one(db: AsyncSession, kind: str, section_ids: list, language: str, profile: str, feedback: str) -> PostIdea:
    """One idea of the requested kind, falling back to the other kind when it cannot be made."""
    sections = [await db.get(Section, sid) for sid in section_ids]
    if kind == "experience":
        try:
            return await create_experience_idea(db, sections, language, profile, feedback)
        except NoStory as e:
            logger.info(f"[AI ideas] no story from the work log ({e}); using a timely topic instead")
    # Timely topic: try the two least recently used sections, then a story from his own work
    for section in sections[:2]:
        try:
            return await create_trend_idea(db, section, language, profile, feedback)
        except topic_feeds.NoFittingTopic as e:
            logger.info(f"[AI ideas] nothing in {section.slug} fits the profile ({e})")
    if kind == "trend" and work_log():
        return await create_experience_idea(db, sections, language, profile, feedback)
    raise topic_feeds.NoFittingTopic("no recent topic fits the writer profile")


async def _finish(db: AsyncSession, run: AIDraftRun, status: str, detail: str) -> AIDraftRun:
    run.status = status
    run.detail = detail[:2000]
    run.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)
    return run


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
    logger.info(f"[AI ideas] scheduler started; next run at {next_run_at().isoformat()}")
    try:
        now = datetime.now(_tz())
        if now.time() >= _run_time() and not await _scheduled_run_exists(now.date()):
            logger.info("[AI ideas] today's run was missed (app was down): running it now")
            await _run_with_retry()
    except asyncio.CancelledError:
        raise
    except Exception as e:
        logger.error(f"[AI ideas] catch-up run failed: {type(e).__name__}: {e}")
    while True:
        try:
            wait = (next_run_at() - datetime.now(timezone.utc)).total_seconds()
            await asyncio.sleep(max(wait, 1))
            await _run_with_retry()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            # Never let the daily loop die: log and wait for the next day
            logger.error(f"[AI ideas] run failed: {type(e).__name__}: {e}")
            await asyncio.sleep(60)
