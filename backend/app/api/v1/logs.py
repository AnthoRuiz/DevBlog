from fastapi import APIRouter, status
from pydantic import BaseModel
from typing import Optional
import os
from app.core.logging import client_logger, LOG_FILE

router = APIRouter(prefix="/logs", tags=["Logs"])

class ClientLogPayload(BaseModel):
    message: str
    stack: Optional[str] = None
    componentStack: Optional[str] = None
    url: Optional[str] = None
    userAgent: Optional[str] = None
    timestamp: Optional[str] = None
    level: Optional[str] = "ERROR"

@router.post("/client", status_code=status.HTTP_204_NO_CONTENT)
async def receive_client_log(payload: ClientLogPayload):
    log_msg = f"[CLIENT_UI_ERROR] URL: {payload.url} | Error: {payload.message}"
    if payload.stack:
        log_msg += f"\nStack: {payload.stack}"
    if payload.componentStack:
        log_msg += f"\nComponentStack: {payload.componentStack}"
    if payload.userAgent:
        log_msg += f"\nUserAgent: {payload.userAgent}"
    
    if payload.level == "WARN":
        client_logger.warning(log_msg)
    else:
        client_logger.error(log_msg)
    return

@router.get("/recent")
async def get_recent_logs(lines: int = 100):
    if not os.path.exists(LOG_FILE):
        return {"total_lines": 0, "recent_lines": []}
    try:
        with open(LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()
            recent = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {"total_lines": len(all_lines), "recent_lines": recent}
    except Exception as e:
        return {"error": str(e), "recent_lines": []}
