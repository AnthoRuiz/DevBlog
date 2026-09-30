"""Decide which blog section a tag name belongs to (e.g. "WoW" -> gaming, never tech).

Uses Google Gemini when GEMINI_API_KEY is configured and falls back to a keyword classifier
otherwise (or when Gemini fails). The fallback only answers when the name clearly matches one
section; anything ambiguous or unknown returns no suggestion, which never blocks tag creation.
"""
import json
import logging
import re
from dataclasses import dataclass
from typing import Optional, Sequence

import httpx

from app.core.config import settings
from app.models.post import Section

logger = logging.getLogger(__name__)

# Below this confidence a suggestion is shown as a hint but never blocks
BLOCKING_CONFIDENCE = 0.7

# Keywords per section slug. Short or ambiguous terms are matched as whole words only.
SECTION_KEYWORDS: dict[str, list[str]] = {
    "gaming": [
        "game", "games", "gaming", "gamer", "videogame", "video game", "esports", "e-sports", "speedrun",
        "wow", "world of warcraft", "warcraft", "starcraft", "diablo", "overwatch", "hearthstone",
        "minecraft", "fortnite", "roblox", "zelda", "mario", "pokemon", "halo", "elden ring", "dark souls",
        "league of legends", "valorant", "dota", "counter-strike", "cs2", "apex legends", "call of duty",
        "gta", "cyberpunk 2077", "the witcher", "baldur's gate", "final fantasy", "animal crossing",
        "steam", "xbox", "playstation", "ps5", "ps4", "nintendo", "switch 2", "steam deck",
        "rpg", "mmo", "mmorpg", "fps", "roguelike", "metroidvania", "indie game",
        "unity", "unreal engine", "godot", "game engine", "gamedev", "game dev", "game design", "pixel art",
    ],
    "mental-health": [
        "mental health", "anxiety", "depression", "burnout", "stress", "therapy", "therapist",
        "mindfulness", "meditation", "self-care", "self care", "wellbeing", "well-being", "wellness",
        "sleep", "emotional", "emotions", "imposter syndrome", "impostor syndrome", "journaling",
        "work-life balance", "work life balance", "adhd", "resilience", "gratitude", "loneliness",
        "productivity", "habits", "motivation", "procrastination", "focus",
    ],
    "career": [
        "interview", "interviews", "interviewing", "leetcode", "hackerrank", "resume", "cv", "cover letter",
        "salary", "negotiation", "hiring", "job search", "job hunt", "career", "promotion", "mentorship",
        "system design", "algorithms", "data structures", "big o", "behavioral", "faang", "maang",
        "onboarding", "portfolio", "linkedin", "freelance", "remote work", "tech lead", "staff engineer",
    ],
    "ai": [
        "ai", "artificial intelligence", "llm", "llms", "gpt", "chatgpt", "claude", "gemini", "copilot",
        "machine learning", "ml", "deep learning", "neural network", "neural networks", "pytorch",
        "tensorflow", "keras", "prompt engineering", "prompting", "rag", "embeddings", "vector database",
        "transformers", "nlp", "computer vision", "ai agents", "agents", "fine-tuning", "fine tuning",
        "hugging face", "openai", "anthropic", "stable diffusion", "diffusion models", "mlops",
    ],
    "tech": [
        "python", "javascript", "typescript", "java", "golang", "rust", "c++", "c#", "kotlin", "swift",
        "react", "vue", "angular", "svelte", "node", "nodejs", "fastapi", "django", "flask", "spring",
        "docker", "kubernetes", "k8s", "linux", "git", "github", "ci/cd", "devops", "cloud", "aws",
        "azure", "gcp", "terraform", "ansible", "nginx", "postgresql", "postgres", "mysql", "mongodb",
        "redis", "sql", "database", "databases", "api", "apis", "rest", "graphql", "microservices",
        "backend", "frontend", "web development", "homelab", "security", "networking", "testing",
        "software engineering", "architecture", "distributed systems", "css", "html",
    ],
}


@dataclass
class TagClassification:
    section_slug: Optional[str]
    confidence: float
    reason: str
    source: str  # "gemini" | "keywords" | "none"


_cache: dict[str, TagClassification] = {}
_CACHE_MAX = 500


def _normalize(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


def _keyword_matches(name: str, keyword: str) -> bool:
    # Whole-word match so "ai" does not match "domain" and "wow" does not match "wowza"
    return re.search(rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])", name) is not None


def classify_by_keywords(name: str) -> TagClassification:
    normalized = _normalize(name)
    hits: dict[str, list[str]] = {}
    for slug, keywords in SECTION_KEYWORDS.items():
        found = [k for k in keywords if _keyword_matches(normalized, k)]
        if found:
            hits[slug] = found
    if len(hits) == 1:
        slug, found = next(iter(hits.items()))
        return TagClassification(slug, 0.8, f'Matches "{found[0]}"', "keywords")
    if len(hits) > 1:
        return TagClassification(None, 0.0, "Matches several sections", "keywords")
    return TagClassification(None, 0.0, "No known keyword", "none")


async def _classify_with_gemini(name: str, sections: Sequence[Section]) -> Optional[TagClassification]:
    options = "\n".join(f'- "{s.slug}": {s.name} — {s.description}' for s in sections)
    prompt = f"""You classify tags for a personal blog into exactly one of its sections.

Sections:
{options}

Tag: "{name}"

Decide which section this tag belongs to. Consider abbreviations and proper nouns
(e.g. "WoW" is World of Warcraft -> gaming; "LeetCode" -> career; "Burnout" -> mental-health).
If the tag could reasonably belong to several sections or you do not recognize it, use null.

Return ONLY a JSON object:
{{"section_slug": "<one of the slugs above or null>", "confidence": <0.0-1.0>, "reason": "<max 12 words>"}}
"""
    api_url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        f"?key={settings.GEMINI_API_KEY.strip()}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0},
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(api_url, json=payload)
        if resp.status_code != 200:
            logger.warning(f"Gemini tag classification returned status {resp.status_code}")
            return None
        parsed = json.loads(resp.json()["candidates"][0]["content"]["parts"][0]["text"])
    except Exception as e:
        logger.error(f"Gemini tag classification failed: {e}")
        return None

    valid = {s.slug for s in sections}
    slug = parsed.get("section_slug")
    slug = slug if slug in valid else None
    try:
        confidence = max(0.0, min(1.0, float(parsed.get("confidence", 0))))
    except (TypeError, ValueError):
        confidence = 0.0
    return TagClassification(slug, confidence if slug else 0.0, str(parsed.get("reason", ""))[:120], "gemini")


async def classify_tag(name: str, sections: Sequence[Section]) -> TagClassification:
    key = _normalize(name)
    if not key:
        return TagClassification(None, 0.0, "Empty name", "none")
    if key in _cache:
        return _cache[key]

    result: Optional[TagClassification] = None
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        result = await _classify_with_gemini(name.strip(), sections)
    if result is None:
        result = classify_by_keywords(name)

    if len(_cache) >= _CACHE_MAX:
        _cache.pop(next(iter(_cache)))
    _cache[key] = result
    return result


def blocks(classification: TagClassification, selected_slug: str) -> bool:
    """A tag is rejected only when another section is suggested with enough confidence."""
    return (
        classification.section_slug is not None
        and classification.section_slug != selected_slug
        and classification.confidence >= BLOCKING_CONFIDENCE
    )
