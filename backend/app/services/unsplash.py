"""Unsplash cover images for AI drafts.

Unsplash API guidelines: hotlink the returned image URLs (do not re-host them), credit the
photographer with links back to Unsplash, and call the photo's download_location when it is used.
"""
import logging
import random
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger("devblog.unsplash")

API = "https://api.unsplash.com"
UTM = "utm_source=anthony_ruiz_blog&utm_medium=referral"


def is_configured() -> bool:
    return bool(settings.UNSPLASH_ACCESS_KEY and settings.UNSPLASH_ACCESS_KEY.strip())


async def find_cover(query: str, avoid_ids: set[str]) -> Optional[dict]:
    """Return {"url", "credit": {name, profile_url, photo_url, id}} for a landscape photo, or None."""
    if not is_configured() or not query.strip():
        return None
    headers = {"Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY.strip()}", "Accept-Version": "v1"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{API}/search/photos",
                params={"query": query, "orientation": "landscape", "per_page": 15, "content_filter": "high"},
                headers=headers,
            )
            if resp.status_code != 200:
                logger.warning(f"[Unsplash] search failed: HTTP {resp.status_code}")
                return None
            results = [p for p in resp.json().get("results", []) if p.get("id") not in avoid_ids]
            if not results:
                return None
            # Some variety among the best matches
            photo = random.choice(results[:6])
            # Required by the API guidelines when a photo is used
            download = photo.get("links", {}).get("download_location")
            if download:
                await client.get(download, headers=headers)
    except httpx.HTTPError as e:
        logger.warning(f"[Unsplash] request failed: {e}")
        return None
    user = photo.get("user", {})
    return {
        "url": photo["urls"]["regular"],
        "credit": {
            "id": photo["id"],
            "name": user.get("name") or user.get("username") or "Unsplash",
            "profile_url": f"{user.get('links', {}).get('html', 'https://unsplash.com')}?{UTM}",
            "photo_url": f"{photo.get('links', {}).get('html', 'https://unsplash.com')}?{UTM}",
        },
    }
