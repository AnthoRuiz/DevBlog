"""Free topic research for AI drafts, used when no provider can search the web.

Candidates come from public APIs (Hacker News via Algolia, DEV.to) filtered by section keywords and
the last 30 days. The LLM picks one with a normal (free-tier) call, then the chosen articles are
downloaded and their text becomes the research notes. Every source is a real, fetched page.
"""
import html
import logging
import random
import re
import time
from typing import Optional

import httpx

from app.models.post import Section
from app.services.llm import ResearchResult, generate_json

logger = logging.getLogger("devblog.ai_drafts")

# Section slug -> (Hacker News queries, DEV.to tags), tuned to what the owner knows and plays
SECTION_SOURCES: dict[str, tuple[list[str], list[str]]] = {
    "tech": (["AWS", "AWS lambda", "python", "fastapi", "postgres", "docker compose", "typescript react", "cloudflare tunnel", "self-hosted"],
             ["aws", "python", "docker", "postgres", "typescript", "react", "selfhosted"]),
    "ai": (["LLM API", "AI coding assistant", "Claude", "Gemini API", "RAG"], ["ai", "llm", "rag"]),
    "career": (["coding interview", "system design interview", "behavioral interview", "leetcode", "data structures", "tech hiring"],
               ["career", "interview", "algorithms", "datastructures", "leetcode"]),
    "gaming": (["Escape from Tarkov", "Tarkov", "Counter-Strike 2", "CS2", "Valheim"], ["gamedev", "gaming"]),
}


class NoFittingTopic(Exception):
    """None of the recent candidates fits the writer profile well enough."""


UA = {"User-Agent": "Mozilla/5.0 (compatible; AnthonyRuizBlog/1.0; +https://blog.anthoruiz.dev)"}
WINDOW_DAYS = 30


async def _candidates(section_slug: str) -> list[dict]:
    queries, tags = SECTION_SOURCES.get(section_slug, ([], []))
    since = int(time.time()) - WINDOW_DAYS * 86400
    found: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=15, headers=UA) as client:
        for query in random.sample(queries, k=min(4, len(queries))):
            try:
                resp = await client.get(
                    "https://hn.algolia.com/api/v1/search",
                    params={"query": query, "tags": "story", "numericFilters": f"points>40,created_at_i>{since}", "hitsPerPage": 8},
                )
                for hit in resp.json().get("hits", []):
                    if hit.get("url") and hit.get("title"):
                        found.setdefault(hit["url"], {"title": hit["title"], "url": hit["url"], "source": "Hacker News", "score": hit.get("points", 0)})
            except Exception as e:
                logger.info(f"[AI drafts] Hacker News query '{query}' failed: {e}")
        for tag in random.sample(tags, k=min(3, len(tags))):
            try:
                resp = await client.get("https://dev.to/api/articles", params={"tag": tag, "top": WINDOW_DAYS, "per_page": 8})
                for article in resp.json():
                    found.setdefault(article["url"], {"title": article["title"], "url": article["url"], "source": "DEV.to", "score": article.get("public_reactions_count", 0)})
            except Exception as e:
                logger.info(f"[AI drafts] DEV.to tag '{tag}' failed: {e}")
    ranked = sorted(found.values(), key=lambda c: c["score"], reverse=True)[:30]
    random.shuffle(ranked)
    return ranked[:15]


def _page_text(raw_html: str, limit: int = 6000) -> str:
    """Readable text of an article page: paragraphs and headings, without scripts or navigation."""
    body = re.sub(r"(?is)<(script|style|nav|header|footer|aside|form)[^>]*>.*?</\1>", " ", raw_html)
    article = re.search(r"(?is)<article[^>]*>(.*?)</article>", body)
    body = article.group(1) if article else body
    blocks = re.findall(r"(?is)<(?:p|h[1-4]|li|pre)[^>]*>(.*?)</(?:p|h[1-4]|li|pre)>", body)
    text = "\n".join(html.unescape(re.sub(r"(?s)<[^>]+>", "", b)).strip() for b in blocks)
    text = re.sub(r"\n{2,}", "\n", re.sub(r"[ \t]+", " ", text)).strip()
    return text[:limit]


PICK_SCHEMA = {
    "type": "object",
    "properties": {
        "index": {"type": "integer"},
        "topic": {"type": "string"},
        "angle": {"type": "string"},
        "related": {"type": "array", "items": {"type": "integer"}},
        "fit_score": {"type": "integer"},
        "fit_reason": {"type": "string"},
    },
    "required": ["index", "topic", "angle", "related", "fit_score", "fit_reason"],
}


MIN_FIT = 4


async def research_from_feeds(section: Section, avoid: list[str], profile: str, feedback: str) -> ResearchResult:
    candidates = await _candidates(section.slug)
    if not candidates:
        raise RuntimeError(f"no recent topic candidates for {section.slug}")
    listing = "\n".join(f"{i}. {c['title']} ({c['source']})" for i, c in enumerate(candidates))
    avoid_list = "\n".join(f"- {t}" for t in avoid) or "- (none yet)"
    pick = await generate_json(
        f"""Pick ONE topic for a new post in the "{section.name}" section ({section.description}) of the blog of a
software engineer in security who runs a homelab (readers: junior to mid-level engineers).

Recent articles from the last {WINDOW_DAYS} days:
{listing}

It must clearly differ from these existing posts:
{avoid_list}

The writer's profile (only pick what he can write about from experience, or what he wants to learn):
{profile}

His reactions to past ideas (pick more like the liked ones, nothing like the others):
{feedback}

Never pick: internal details of any employer (including Amazon), politics, medical or mental-health advice, rumors,
or pure product announcements without technical substance.
Return the index of the best article, the topic in one line, a practical angle for a hands-on engineer, the indexes
of up to two related articles from the list that add context (may be empty), and fit_score from 1 to 5: how well
he can contribute his own experience or opinion (5 = squarely in what he knows, 4 = what he knows or wants to learn,
3 or less = he would have little to add), with a short fit_reason.""",
        PICK_SCHEMA,
        task="ai_draft_pick_topic",
        max_tokens=600,
        timeout=60,
    )
    chosen = pick.data
    if chosen.get("fit_score", 0) < MIN_FIT:
        raise NoFittingTopic(f"best candidate scored {chosen.get('fit_score')}: {chosen.get('fit_reason', '')}")
    indexes = [chosen["index"], *chosen.get("related", [])]
    picked = [candidates[i] for i in dict.fromkeys(indexes) if isinstance(i, int) and 0 <= i < len(candidates)]
    if not picked:
        raise RuntimeError("the model picked no valid article")

    notes: list[str] = [f"TOPIC: {chosen['topic']}", f"ANGLE: {chosen['angle']}"]
    sources: list[dict] = []
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=UA) as client:
        for candidate in picked:
            try:
                resp = await client.get(candidate["url"])
            except httpx.HTTPError:
                continue
            if resp.status_code >= 400 or "html" not in resp.headers.get("content-type", ""):
                continue
            text = _page_text(resp.text)
            if len(text) < 400:
                continue
            notes.append(f"\n--- Article: {candidate['title']} ({resp.url}) ---\n{text}")
            sources.append({"title": candidate["title"], "url": str(resp.url).split("#")[0]})
    if not sources:
        raise RuntimeError("could not read any of the chosen articles")
    return ResearchResult("\n".join(notes), sources, f"feeds+{pick.provider}")
