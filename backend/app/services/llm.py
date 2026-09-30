"""Provider-agnostic LLM access with automatic failover (Claude and Google Gemini).

Every AI feature asks for a JSON object matching a schema through generate_json(). Providers are
tried in LLM_PROVIDER_ORDER, skipping those without an API key; any error, timeout, refusal or
invalid JSON moves on to the next one. When every provider fails (or none is configured)
LLMUnavailable is raised and the caller decides on a non-AI fallback or an explicit error.
"""
import json
import logging
from dataclasses import dataclass
from typing import Any, Literal, Optional

import anthropic
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

Effort = Literal["low", "medium", "high"]


class LLMUnavailable(Exception):
    """No configured provider could produce a valid answer."""


@dataclass
class LLMResult:
    data: dict[str, Any]
    provider: str  # e.g. "claude:claude-opus-5-5" or "gemini:gemini-1.5-flash"


def _has(key: Optional[str]) -> bool:
    return bool(key and key.strip())


def configured_providers() -> list[str]:
    """Providers with an API key, in the configured failover order."""
    available = {"claude": _has(settings.ANTHROPIC_API_KEY), "gemini": _has(settings.GEMINI_API_KEY)}
    order = [p.strip().lower() for p in settings.LLM_PROVIDER_ORDER.split(",") if p.strip()]
    return [p for p in order if available.get(p)]


def _check_required(data: Any, schema: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("response is not a JSON object")
    missing = [k for k in schema.get("required", []) if k not in data]
    if missing:
        raise ValueError(f"missing keys: {', '.join(missing)}")
    return data


# ── Claude ────────────────────────────────────────────────────────────────────
_claude_client: Optional[anthropic.AsyncAnthropic] = None


def _claude() -> anthropic.AsyncAnthropic:
    global _claude_client
    if _claude_client is None:
        # One SDK retry, then fail over to the next provider instead of retrying longer
        _claude_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY.strip(), max_retries=1)
    return _claude_client


async def _call_claude(prompt: str, schema: dict, max_tokens: int, timeout: float, effort: Effort, stream: bool) -> LLMResult:
    params: dict[str, Any] = dict(
        model=settings.CLAUDE_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
        # Structured output guarantees the text block is valid JSON for the schema
        output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        # Server-side fallback: if the model declines, the API re-runs the request on another model
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    client = _claude().with_options(timeout=timeout)
    if stream:
        # Long outputs (translations) stream to stay clear of HTTP timeouts
        async with client.beta.messages.stream(**params) as s:
            response = await s.get_final_message()
    else:
        response = await client.beta.messages.create(**params)

    if response.stop_reason == "refusal":
        raise ValueError("request declined")
    if response.stop_reason == "max_tokens":
        raise ValueError("output truncated at max_tokens")
    text = next((b.text for b in response.content if b.type == "text"), None)
    if text is None:
        raise ValueError("no text block in response")
    return LLMResult(_check_required(json.loads(text), schema), f"claude:{response.model}")


# ── Gemini ────────────────────────────────────────────────────────────────────
async def _call_gemini(prompt: str, schema: dict, max_tokens: int, timeout: float) -> LLMResult:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        f"?key={settings.GEMINI_API_KEY.strip()}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2, "maxOutputTokens": max_tokens},
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload)
    if resp.status_code != 200:
        raise ValueError(f"HTTP {resp.status_code}")
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    return LLMResult(_check_required(json.loads(text), schema), f"gemini:{settings.GEMINI_MODEL}")


async def generate_json(
    prompt: str,
    schema: dict,
    *,
    task: str,
    max_tokens: int = 1024,
    timeout: float = 20.0,
    effort: Effort = "low",
    stream: bool = False,
) -> LLMResult:
    """Ask each configured provider in order for a JSON object matching `schema`."""
    providers = configured_providers()
    if not providers:
        raise LLMUnavailable("no AI provider configured (set ANTHROPIC_API_KEY and/or GEMINI_API_KEY)")

    for provider in providers:
        try:
            if provider == "claude":
                return await _call_claude(prompt, schema, max_tokens, timeout, effort, stream)
            return await _call_gemini(prompt, schema, max_tokens, timeout)
        except anthropic.AuthenticationError:
            logger.error(f"[LLM] claude rejected the API key ({task}); trying the next provider")
        except Exception as e:
            logger.warning(f"[LLM] {provider} failed for {task}: {type(e).__name__}: {e}")
    raise LLMUnavailable(f"every configured AI provider failed ({', '.join(providers)})")
