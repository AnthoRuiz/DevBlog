"""Local media storage: uploaded images live in UPLOADS_DIR and are served by Nginx at /uploads/."""
import os
import uuid
from pathlib import Path
from typing import Optional

# Docker volume inside the container; fall back to backend/uploads when running on the host
UPLOADS_DIR = Path("/app/uploads") if Path("/app").exists() else Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

MB = 1024 * 1024
# Animated GIFs are much heavier than still images, so they get their own limit
MAX_IMAGE_BYTES = 5 * MB
MAX_GIF_BYTES = 15 * MB
MAX_UPLOAD_BYTES = max(MAX_IMAGE_BYTES, MAX_GIF_BYTES)


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
