"""AI writing features: post translation, tag suggestions and reading-time estimates.

All model calls go through services/llm.py (Claude and Gemini with failover). Without a working
provider, translation raises LLMUnavailable (it cannot be faked), while tag suggestions and
reading time fall back to transparent heuristics that report their source.
"""
import math
import re
from typing import Optional

from app.services.llm import LLMUnavailable, generate_json

LANG_NAMES = {
    "es": "Spanish (Español)",
    "en": "English",
    "pt": "Portuguese (Português)",
    "fr": "French (Français)",
}

KEYWORD_PROVIDER = "keywords"
HEURISTIC_PROVIDER = "heuristic"

_TRANSLATION_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "content_markdown": {"type": "string"},
    },
    "required": ["title", "summary", "content_markdown"],
    "additionalProperties": False,
}

_TAGS_SCHEMA = {
    "type": "object",
    "properties": {"suggested_tags": {"type": "array", "items": {"type": "string"}}},
    "required": ["suggested_tags"],
    "additionalProperties": False,
}

_READING_TIME_SCHEMA = {
    "type": "object",
    "properties": {"reading_time_minutes": {"type": "integer"}},
    "required": ["reading_time_minutes"],
    "additionalProperties": False,
}


async def translate_post_content(
    title: str,
    summary: str,
    content_markdown: str,
    target_lang: str,
    source_lang: str = "es",
) -> dict:
    """Translate a post with an LLM. Raises LLMUnavailable when no provider can do it."""
    target_name = LANG_NAMES.get(target_lang, target_lang)
    source_name = LANG_NAMES.get(source_lang, source_lang)
    prompt = f"""You are an expert technical translator for a personal blog about software engineering,
AI, careers, mental health and gaming. Translate the article below from {source_name} to {target_name}.

Rules:
1. Translate the title, summary and markdown content into natural, professional {target_name}.
2. Keep every code block, shell command, configuration snippet, URL and inline `code` exactly as is;
   never translate code, identifiers or keywords.
3. Keep all markdown structure: headings, lists, emphasis, quotes, tables, links and images.
4. Keep established technical terms (Docker, FastAPI, PostgreSQL, homelab, pub/sub, ...).

Title: {title}
Summary: {summary}
Markdown content:
{content_markdown}
"""
    # Output is roughly as long as the input; leave headroom for languages that expand
    approx_tokens = (len(title) + len(summary) + len(content_markdown)) // 3
    max_tokens = max(4096, min(64000, approx_tokens * 2 + 2048))
    result = await generate_json(
        prompt,
        _TRANSLATION_SCHEMA,
        task="translate_post",
        max_tokens=max_tokens,
        timeout=180.0,
        effort="medium",
        stream=True,
    )
    return {**result.data, "target_lang": target_lang, "provider": result.provider}


def _suggest_tags_by_keywords(title: str, summary: str, content_markdown: str, existing_tags: list[str]) -> list[str]:
    """Offline fallback: existing tag names and known technologies mentioned in the text."""
    text = f"{title} {summary} {content_markdown}".lower()
    # Some keywords are Spanish on purpose so Spanish-language posts also match
    tech_keywords = [
        "docker", "kubernetes", "fastapi", "python", "typescript", "react",
        "postgresql", "rabbitmq", "redis", "nginx", "linux", "homelab",
        "devops", "cloud", "aws", "graphql", "microservicios", "cache",
        "seguridad", "api", "monitoring", "grafana", "prometheus",
    ]
    found: list[str] = []
    for tag in existing_tags:
        if tag.lower() in text and tag not in found:
            found.append(tag)
    for keyword in tech_keywords:
        if re.search(rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])", text):
            name = keyword.capitalize()
            if name.lower() not in {f.lower() for f in found}:
                found.append(name)
    return found[:5]


async def suggest_post_tags(
    title: str,
    summary: str,
    content_markdown: str,
    existing_tags: list[str],
) -> tuple[list[str], str, Optional[str]]:
    """Return (tags, provider, fallback_reason).

    provider is the LLM used, or "keywords" for the offline fallback; fallback_reason says why
    (not_configured | quota_exhausted | failed) and is None when an LLM answered.
    """
    prompt = f"""You suggest tags for a personal blog post (topics: software engineering, AI,
interviews and career, mental health, gaming). Suggest the 3 to 5 most relevant tags.
Prefer these existing tags when they fit: {', '.join(existing_tags)}

Title: {title}
Summary: {summary}
Markdown content:
{content_markdown[:3000]}
"""
    try:
        result = await generate_json(prompt, _TAGS_SCHEMA, task="suggest_tags", max_tokens=512, timeout=20.0)
        tags = [str(t).strip() for t in result.data.get("suggested_tags", []) if str(t).strip()]
        return tags[:5], result.provider, None
    except LLMUnavailable as e:
        return _suggest_tags_by_keywords(title, summary, content_markdown, existing_tags), KEYWORD_PROVIDER, e.reason


def _estimate_reading_time_heuristic(content: str) -> int:
    """Offline fallback: prose at 180 words/min, code at ~20 lines/min, plus a density factor."""
    code_blocks = re.findall(r"```[\s\S]*?```", content)
    code_text = " ".join(code_blocks)
    prose = re.sub(r"```[\s\S]*?```", "", content)

    time_prose = len(prose.split()) / 180.0
    time_code = (len(code_text.splitlines()) if code_text else 0) / 20.0

    # Includes Spanish terms on purpose for Spanish-language posts
    dense_keywords = [
        "architecture", "arquitectura", "kubernetes", "docker", "pipeline",
        "concurrency", "distributed", "database", "postgres", "fastapi",
        "security", "troubleshooting", "clustering", "failover", "replica",
    ]
    dense_hits = sum(1 for kw in dense_keywords if kw in content.lower())
    density = 1.0 + min(0.35, dense_hits * 0.05)
    return max(1, math.ceil((time_prose + time_code) * density))


async def estimate_reading_time(title: str, summary: str, content_markdown: str) -> int:
    """Realistic reading time in minutes for a developer (LLM, or heuristic fallback)."""
    content = (content_markdown or "").strip()
    if not content:
        return 1

    prompt = f"""Estimate a realistic reading and comprehension time in minutes for a developer
reading this blog post. Regular prose reads at about 170-190 words per minute; code blocks,
configuration and architecture explanations take longer (about 20-30 seconds per substantive
snippet). Return a whole number of minutes, at least 1.

Title: {title}
Summary: {summary}
Markdown content:
{content[:4000]}
"""
    try:
        result = await generate_json(prompt, _READING_TIME_SCHEMA, task="reading_time", max_tokens=256, timeout=15.0)
        minutes = result.data.get("reading_time_minutes")
        if isinstance(minutes, (int, float)) and minutes >= 1:
            return min(120, max(1, round(minutes)))
    except LLMUnavailable:
        pass
    return _estimate_reading_time_heuristic(content)
