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
    Lista todos los backups disponibles en disco y la política de retención activa.
    Requiere rol de administrador (ADMIN).
    """
    backups = backup_service.list_backups()
    return {
        "status": "healthy",
        "retention_policy": "Conserva las 7 copias más recientes (rotación automática diaria)",
        "retention_limit": 7,
        "total_backups": len(backups),
        "backups": backups
    }


@router.post("/create", response_model=Dict[str, Any])
async def create_admin_backup(
    current_user: User = Depends(get_current_admin)
):
    """
    Dispara la creación inmediata de un dump comprimido en .sql.gz y ejecuta la rotación.
    Requiere rol de administrador (ADMIN).
    """
    try:
        result = await backup_service.create_backup(keep=7)
        return {
            "message": "Backup generado exitosamente",
            "backup": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo al generar el backup: {str(e)}"
        )


@router.get("/{filename}/download")
async def download_admin_backup(
    filename: str,
    current_user: User = Depends(get_current_admin)
):
    """
    Permite descargar directamente el archivo .sql.gz seleccionado.
    Requiere rol de administrador (ADMIN).
    """
    path = backup_service.get_backup_path(filename)
    if not path or not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo de backup no encontrado o nombre inválido"
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
    Elimina un archivo de backup específico.
    Requiere rol de administrador (ADMIN).
    """
    success = backup_service.delete_backup_file(filename)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se pudo eliminar el backup (no existe o nombre inválido)"
        )

    return {"message": f"Backup {filename} eliminado correctamente"}
