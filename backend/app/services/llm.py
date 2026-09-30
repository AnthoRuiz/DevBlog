"""Provider-agnostic LLM access with automatic failover (Claude and Google Gemini).

Every AI feature asks for a JSON object matching a schema through generate_json(). Providers are
tried in LLM_PROVIDER_ORDER, skipping those without an API key; any error, timeout, refusal or
invalid JSON moves on to the next one. When every provider fails (or none is configured)
LLMUnavailable is raised and the caller decides on a non-AI fallback or an explicit error.
"""
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Literal, Optional

import anthropic
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

Effort = Literal["low", "medium", "high"]


UnavailableReason = Literal["not_configured", "quota_exhausted", "failed"]


class LLMUnavailable(Exception):
    """No configured provider could produce a valid answer.

    reason: "not_configured" (no API key at all), "quota_exhausted" (every provider tried was out of
    quota / rate limited) or "failed" (any other error). retry_after: seconds, when a provider said so.
    """

    def __init__(self, message: str, reason: UnavailableReason = "failed", retry_after: Optional[int] = None):
        super().__init__(message)
        self.reason = reason
        self.retry_after = retry_after


class ProviderQuotaExceeded(Exception):
    """A provider rejected the call for quota, rate-limit or credit reasons."""

    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


def _parse_seconds(value: Optional[str]) -> Optional[int]:
    """Parse "34", "34s" or "34.5s" into whole seconds."""
    if not value:
        return None
    match = re.fullmatch(r"\s*(\d+(?:\.\d+)?)s?\s*", str(value))
    return int(float(match.group(1))) + (0 if float(match.group(1)).is_integer() else 1) if match else None


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
    try:
        return await _send_claude(client, params, schema, stream)
    except anthropic.RateLimitError as e:
        raise ProviderQuotaExceeded(str(e), _parse_seconds(e.response.headers.get("retry-after")))
    except anthropic.BadRequestError as e:
        # An exhausted prepaid balance comes back as a 400 about the credit balance
        if "credit balance" in str(e).lower():
            raise ProviderQuotaExceeded(str(e))
        raise


async def _send_claude(client: anthropic.AsyncAnthropic, params: dict, schema: dict, stream: bool) -> LLMResult:
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
    if resp.status_code == 429:
        # Free-tier quota or rate limit (RESOURCE_EXHAUSTED); the wait may come as a header or a RetryInfo detail
        retry_after = _parse_seconds(resp.headers.get("retry-after"))
        try:
            for detail in resp.json().get("error", {}).get("details", []):
                retry_after = retry_after or _parse_seconds(detail.get("retryDelay"))
        except Exception:
            pass
        raise ProviderQuotaExceeded(f"HTTP 429 {resp.text[:200]}", retry_after)
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
        raise LLMUnavailable("no AI provider configured (set ANTHROPIC_API_KEY and/or GEMINI_API_KEY)", "not_configured")

    quota_hits: list[Optional[int]] = []
    for provider in providers:
        try:
            if provider == "claude":
                return await _call_claude(prompt, schema, max_tokens, timeout, effort, stream)
            return await _call_gemini(prompt, schema, max_tokens, timeout)
        except ProviderQuotaExceeded as e:
            logger.warning(f"[LLM] {provider} is out of quota for {task} (retry after: {e.retry_after or 'unknown'}s)")
            quota_hits.append(e.retry_after)
        except anthropic.AuthenticationError:
            logger.error(f"[LLM] claude rejected the API key ({task}); trying the next provider")
        except Exception as e:
            logger.warning(f"[LLM] {provider} failed for {task}: {type(e).__name__}: {e}")

    if len(quota_hits) == len(providers):
        # Every provider is out of quota: report the soonest known retry time
        known = [s for s in quota_hits if s]
        raise LLMUnavailable(
            f"AI quota exhausted on every configured provider ({', '.join(providers)})",
            "quota_exhausted",
            min(known) if known else None,
        )
    raise LLMUnavailable(f"every configured AI provider failed ({', '.join(providers)})", "failed")
