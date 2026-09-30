from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.user import User
from app.services import media_service
from app.services.backup_service import format_bytes

router = APIRouter(prefix="/admin/media", tags=["Admin Media"])


@router.get("")
async def get_media_stats(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Storage usage of uploaded media and orphaned files (not referenced by any post
    and older than the grace period). Requires the ADMIN role.
    """
    summary = await media_service.scan_media(db)
    return {
        "total_files": summary["total_files"],
        "total_size_display": format_bytes(summary["total_bytes"]),
        "orphan_files": len(summary["orphans"]),
        "orphan_size_display": format_bytes(summary["orphan_bytes"]),
        "orphans": summary["orphans"],
        "recent_unreferenced": summary["recent_unreferenced"],
        "grace_hours": media_service.ORPHAN_GRACE_SECONDS // 3600,
    }


@router.post("/cleanup")
async def cleanup_media(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete orphaned uploads now (the daily job does this after each backup).
    Requires the ADMIN role.
    """
    result = await media_service.cleanup_orphans(db)
    return {
        "deleted": result["deleted"],
        "deleted_count": len(result["deleted"]),
        "freed_display": format_bytes(result["freed_bytes"]),
    }
