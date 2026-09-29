import os
import gzip
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote
from typing import List, Dict, Any, Optional

from app.core.config import settings

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


def rotate_backups(keep: int = 7) -> List[str]:
    """
    Keep the newest `keep` backups by creation time and delete older ones
    to avoid wasting disk space.
    """
    if not BACKUP_DIR.exists():
        return []

    files = [f for f in BACKUP_DIR.iterdir() if f.is_file() and f.name.endswith(".sql.gz")]
    # Newest first
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    deleted = []
    if len(files) > keep:
        for old_file in files[keep:]:
            try:
                old_file.unlink()
                deleted.append(old_file.name)
            except Exception as e:
                print(f"[Backup] Failed to delete old backup {old_file.name}: {e}")

    return deleted


async def create_backup(keep: int = 7) -> Dict[str, Any]:
    """
    Run pg_dump in the background, gzip the output to .sql.gz, write it to disk
    and apply the `keep`-copies retention policy.
    """
    creds = get_db_credentials()
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.strftime("%Y%m%d_%H%M%S")
    filename = f"backup_devblog_{timestamp_str}.sql.gz"
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

    # Rotate old backups
    deleted_files = rotate_backups(keep=keep)

    return {
        "filename": filename,
        "size_bytes": size_bytes,
        "size_display": format_bytes(size_bytes),
        "created_at": now_utc.isoformat(),
        "rotated_deleted": deleted_files
    }


def list_backups() -> List[Dict[str, Any]]:
    """Return existing backups sorted newest first."""
    if not BACKUP_DIR.exists():
        return []

    files = [f for f in BACKUP_DIR.iterdir() if f.is_file() and f.name.endswith(".sql.gz")]
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    result = []
    for f in files:
        stat = f.stat()
        mtime_utc = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        result.append({
            "filename": f.name,
            "size_bytes": stat.st_size,
            "size_display": format_bytes(stat.st_size),
            "created_at": mtime_utc.isoformat()
        })

    return result


def get_backup_path(filename: str) -> Optional[Path]:
    """Validate a backup filename and resolve its path, preventing path traversal."""
    safe_name = Path(filename).name
    if safe_name != filename or not filename.endswith(".sql.gz"):
        return None

    path = BACKUP_DIR / safe_name
    if not path.is_file():
        return None

    return path


def delete_backup_file(filename: str) -> bool:
    """Delete a single backup file."""
    path = get_backup_path(filename)
    if not path:
        return False
    try:
        path.unlink()
        return True
    except Exception:
        return False
