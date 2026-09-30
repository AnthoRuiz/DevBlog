"""Local media storage: uploaded images live in UPLOADS_DIR and are served by Nginx at /uploads/."""
import re
import time
import uuid
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Docker volume inside the container; fall back to backend/uploads when running on the host
UPLOADS_DIR = Path("/app/uploads") if Path("/app").exists() else Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

MB = 1024 * 1024
# Animated GIFs are much heavier than still images, so they get their own limit
MAX_IMAGE_BYTES = 5 * MB
MAX_GIF_BYTES = 15 * MB
MAX_UPLOAD_BYTES = max(MAX_IMAGE_BYTES, MAX_GIF_BYTES)

# Only files created by save_image() are ever considered for cleanup
UPLOAD_NAME_RE = re.compile(r"^img_[0-9a-f]{12}\.(?:jpg|png|gif|webp)$")
# References to uploads inside cover URLs or markdown (relative or absolute URLs)
UPLOAD_REF_RE = re.compile(r"/uploads/(img_[0-9a-f]{12}\.(?:jpg|png|gif|webp))")
# Recently uploaded files may belong to a post that is still being written
ORPHAN_GRACE_SECONDS = 24 * 3600


def detect_image_ext(data: bytes) -> Optional[str]:
    """Identify JPG, PNG, GIF or WEBP by their file signature (magic bytes)."""
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


def max_bytes_for(ext: str) -> int:
    return MAX_GIF_BYTES if ext == ".gif" else MAX_IMAGE_BYTES


def save_image(data: bytes, ext: str) -> str:
    """Store an already-validated image under a random name and return its public URL."""
    filename = f"img_{uuid.uuid4().hex[:12]}{ext}"
    with open(UPLOADS_DIR / filename, "wb") as f:
        f.write(data)
    return f"/uploads/{filename}"


async def _referenced_uploads(db: AsyncSession) -> set[str]:
    """Filenames referenced by any post (published or draft), in its cover or its markdown."""
    from app.models.post import Post
    rows = await db.execute(select(Post.cover_image_url, Post.content_markdown))
    refs: set[str] = set()
    for cover, content in rows.all():
        refs.update(UPLOAD_REF_RE.findall(cover or ""))
        refs.update(UPLOAD_REF_RE.findall(content or ""))
    return refs


async def scan_media(db: AsyncSession) -> dict:
    """Classify stored uploads into referenced, orphaned (past the grace period) and recent."""
    refs = await _referenced_uploads(db)
    now = time.time()
    summary = {"total_files": 0, "total_bytes": 0, "orphans": [], "orphan_bytes": 0, "recent_unreferenced": 0}
    for entry in UPLOADS_DIR.iterdir():
        if not entry.is_file() or entry.is_symlink():
            continue
        stat = entry.stat()
        summary["total_files"] += 1
        summary["total_bytes"] += stat.st_size
        if not UPLOAD_NAME_RE.match(entry.name) or entry.name in refs:
            continue
        if now - stat.st_mtime < ORPHAN_GRACE_SECONDS:
            summary["recent_unreferenced"] += 1
        else:
            summary["orphans"].append(entry.name)
            summary["orphan_bytes"] += stat.st_size
    summary["orphans"].sort()
    return summary


async def cleanup_orphans(db: AsyncSession) -> dict:
    """Delete orphaned uploads; returns the deleted filenames and bytes freed."""
    summary = await scan_media(db)
    deleted, freed = [], 0
    for name in summary["orphans"]:
        path = UPLOADS_DIR / name
        try:
            size = path.stat().st_size
            path.unlink()
            deleted.append(name)
            freed += size
        except FileNotFoundError:
            continue
    return {"deleted": deleted, "freed_bytes": freed}
