from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from typing import List, Dict, Any

from app.api.deps import get_current_admin
from app.models.user import User
from app.services import backup_service

router = APIRouter(prefix="/admin/backups", tags=["Admin Backups"])


@router.get("", response_model=Dict[str, Any])
async def list_admin_backups(
    current_user: User = Depends(get_current_admin)
):
    """
    List all backups on disk and the active retention policy.
    Requires the ADMIN role.
    """
    backups = backup_service.list_backups()
    return {
        "status": "healthy",
        "retention_policy": "Keeps the 7 most recent copies of the database and uploaded media (automatic daily rotation)",
        "retention_limit": 7,
        "total_backups": len(backups),
        "backups": backups
    }


@router.post("/create", response_model=Dict[str, Any])
async def create_admin_backup(
    current_user: User = Depends(get_current_admin)
):
    """
    Create a database dump (.sql.gz) and media archive (.media.tar.gz) now, then run rotation.
    Requires the ADMIN role.
    """
    try:
        result = await backup_service.create_backup(keep=7)
        return {
            "message": "Backup created successfully",
            "backup": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create backup: {str(e)}"
        )


@router.get("/{filename}/download")
async def download_admin_backup(
    filename: str,
    current_user: User = Depends(get_current_admin)
):
    """
    Download a backup file: a database dump (.sql.gz) or a media archive (.media.tar.gz).
    Requires the ADMIN role.
    """
    path = backup_service.get_backup_path(filename)
    if not path or not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup file not found or invalid name"
        )

    return FileResponse(
        path=path,
        media_type="application/gzip",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.delete("/{filename}")
async def delete_admin_backup(
    filename: str,
    current_user: User = Depends(get_current_admin)
):
    """
    Delete a backup file (deleting a database dump also deletes its media archive).
    Requires the ADMIN role.
    """
    success = backup_service.delete_backup_file(filename)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not delete backup (not found or invalid name)"
        )

    return {"message": f"Backup {filename} deleted successfully"}
