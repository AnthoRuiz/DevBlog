import os
import gzip
import asyncio
import tarfile
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.services.media_service import UPLOADS_DIR

DB_SUFFIX = ".sql.gz"
# Uploaded media is archived next to each database dump with the same timestamp
MEDIA_SUFFIX = ".media.tar.gz"

# Backup storage directory
BACKUP_DIR = Path("/app/backups")
if not BACKUP_DIR.exists() and not Path("/app").exists():
    # Fallback when running directly on the host
    BACKUP_DIR = Path(__file__).resolve().parent.parent.parent / "backups"

BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def get_db_credentials() -> Dict[str, str]:
    """Extract PostgreSQL credentials from settings.DATABASE_URL."""
    url = urlparse(settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))
    return {
        # User and password are percent-encoded in the URL (see Settings._build_database_url)
        "user": unquote(url.username) if url.username else "devblog_user",
        "password": unquote(url.password) if url.password else "",
        "host": url.hostname or "db",
        "port": str(url.port or 5432),
        "name": url.path.lstrip("/") or "devblog"
    }


def format_bytes(size: int) -> str:
    """Format a byte count as a human-readable size (KB, MB, GB)."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"


def media_path_for(db_filename: str) -> Path:
    """Path of the media archive paired with a database dump."""
    return BACKUP_DIR / (db_filename[: -len(DB_SUFFIX)] + MEDIA_SUFFIX)


def _archive_media(target: Path) -> int:
    """Write every regular file in UPLOADS_DIR to a gzipped tar; returns the file count."""
    count = 0
    tmp = target.with_name(target.name + ".tmp")
    with tarfile.open(tmp, "w:gz", compresslevel=6) as tar:
        for entry in sorted(UPLOADS_DIR.iterdir()):
            # Uploads are stored flat; skip directories and symlinks
            if entry.is_file() and not entry.is_symlink():
                tar.add(entry, arcname=entry.name, recursive=False)
                count += 1
    tmp.replace(target)
    return count


def rotate_backups(keep: int = 7) -> List[str]:
    """
    Keep the newest `keep` backups by creation time and delete older ones
    to avoid wasting disk space.
    """
    if not BACKUP_DIR.exists():
        return []

    files = [f for f in BACKUP_DIR.iterdir() if f.is_file() and f.name.endswith(DB_SUFFIX)]
    # Newest first
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    deleted = []
    if len(files) > keep:
        for old_file in files[keep:]:
            for path in (old_file, media_path_for(old_file.name)):
                try:
                    if path.exists():
                        path.unlink()
                        deleted.append(path.name)
                except Exception as e:
                    print(f"[Backup] Failed to delete old backup {path.name}: {e}")

    return deleted


async def create_backup(keep: int = 7) -> Dict[str, Any]:
    """
    Run pg_dump in the background, gzip the output to .sql.gz, archive uploaded media
    to a paired .media.tar.gz, and apply the `keep`-copies retention policy.
    """
    creds = get_db_credentials()
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.strftime("%Y%m%d_%H%M%S")
    filename = f"backup_devblog_{timestamp_str}{DB_SUFFIX}"
    target_path = BACKUP_DIR / filename

    env = os.environ.copy()
    env["PGPASSWORD"] = creds["password"]

    # Run pg_dump
    proc = await asyncio.create_subprocess_exec(
        "pg_dump",
        "-h", creds["host"],
        "-p", creds["port"],
        "-U", creds["user"],
        "-d", creds["name"],
        "--clean",
        "--if-exists",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )

    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        err_msg = stderr.decode(errors="ignore").strip()
        raise RuntimeError(f"pg_dump failed (exit code {proc.returncode}): {err_msg}")

    # Compress with gzip
    compressed_data = gzip.compress(stdout, compresslevel=6)
    with open(target_path, "wb") as f:
        f.write(compressed_data)

    size_bytes = target_path.stat().st_size

    # Archive uploaded media (off the event loop: it can be large)
    media_path = media_path_for(filename)
    media_count = await asyncio.to_thread(_archive_media, media_path)
    media_size = media_path.stat().st_size

    # Rotate old backups
    deleted_files = rotate_backups(keep=keep)

    return {
        "filename": filename,
        "size_bytes": size_bytes,
        "size_display": format_bytes(size_bytes),
        "created_at": now_utc.isoformat(),
        "media_filename": media_path.name,
        "media_files": media_count,
        "media_size_bytes": media_size,
        "media_size_display": format_bytes(media_size),
        "rotated_deleted": deleted_files
    }


def list_backups() -> List[Dict[str, Any]]:
    """Return existing backups sorted newest first."""
    if not BACKUP_DIR.exists():
        return []

    files = [f for f in BACKUP_DIR.iterdir() if f.is_file() and f.name.endswith(DB_SUFFIX)]
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    result = []
    for f in files:
        stat = f.stat()
        mtime_utc = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        item = {
            "filename": f.name,
            "size_bytes": stat.st_size,
            "size_display": format_bytes(stat.st_size),
            "created_at": mtime_utc.isoformat(),
            "media_filename": None,
        }
        media = media_path_for(f.name)
        # Backups made before media archiving existed have no paired archive
        if media.is_file():
            media_size = media.stat().st_size
            item.update({
                "media_filename": media.name,
                "media_size_bytes": media_size,
                "media_size_display": format_bytes(media_size),
            })
        result.append(item)

    return result


def get_backup_path(filename: str) -> Optional[Path]:
    """Validate a backup filename and resolve its path, preventing path traversal."""
    safe_name = Path(filename).name
    if safe_name != filename or not filename.endswith((DB_SUFFIX, MEDIA_SUFFIX)):
        return None

    path = BACKUP_DIR / safe_name
    if not path.is_file():
        return None

    return path


def delete_backup_file(filename: str) -> bool:
    """Delete a backup file; deleting a database dump also deletes its media archive."""
    path = get_backup_path(filename)
    if not path:
        return False
    try:
        path.unlink()
        if filename.endswith(DB_SUFFIX):
            media_path_for(filename).unlink(missing_ok=True)
        return True
    except Exception:
        return False
