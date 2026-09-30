"""Per-user daily quotas for costly actions (AI calls, uploads).

Kept in memory: counters reset at UTC midnight and on restart, which is enough for a single-node
homelab. Admins are exempt. The shared free AI quota is the main thing being protected.
"""
from collections import defaultdict
from datetime import date, datetime, timezone

from fastapi import HTTPException, status

from app.models.user import User, UserRole

DAILY_LIMITS = {
    "ai": 30,          # translation, tag suggestions, reading-time estimates
    "tag_check": 200,  # real-time tag/section validation while typing (debounced, cached)
    "upload": 20,      # image uploads
}

_usage: dict[tuple[str, str, date], int] = defaultdict(int)


def consume(user: User, kind: str) -> None:
    """Count one use of `kind` for `user`; raise 429 once today's limit is reached."""
    if user.role == UserRole.ADMIN:
        return
    today = datetime.now(timezone.utc).date()
    if len(_usage) > 10_000:
        # Drop counters from previous days
        for key in [k for k in _usage if k[2] != today]:
            del _usage[key]
    key = (str(user.id), kind, today)
    limit = DAILY_LIMITS[kind]
    if _usage[key] >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit reached for this action ({limit} per day). Try again tomorrow.",
        )
    _usage[key] += 1
