from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel
from typing import Literal, Optional
from collections import deque
import os
from app.core.logging import client_logger, LOG_FILE
from app.core.limiter import limiter
from app.api.deps import get_current_admin
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["Logs"])

class ClientLogPayload(BaseModel):
    message: str
    stack: Optional[str] = None
    componentStack: Optional[str] = None
    url: Optional[str] = None
    userAgent: Optional[str] = None
    timestamp: Optional[str] = None
    level: Literal["INFO", "WARN", "ERROR"] = "ERROR"

def _single_line(value: Optional[str], max_len: int) -> str:
    """Truncate and strip newlines so a client cannot forge log entries."""
    if not value:
        return ""
    return value[:max_len].replace("\r", " ").replace("\n", " ⏎ ")

def _indented_block(value: str, max_len: int) -> str:
    """Truncate a multi-line block (stack traces) and indent it so it cannot pass for real entries."""
    return value[:max_len].replace("\r", "").replace("\n", "\n    ")

@router.post("/client", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def receive_client_log(request: Request, payload: ClientLogPayload):
    log_msg = f"[CLIENT_UI_ERROR] URL: {_single_line(payload.url, 2048)} | Error: {_single_line(payload.message, 2000)}"
    if payload.stack:
        log_msg += f"\n    Stack: {_indented_block(payload.stack, 8000)}"
    if payload.componentStack:
        log_msg += f"\n    ComponentStack: {_indented_block(payload.componentStack, 8000)}"
    if payload.userAgent:
        log_msg += f"\n    UserAgent: {_single_line(payload.userAgent, 512)}"

    if payload.level == "WARN":
        client_logger.warning(log_msg)
    else:
        client_logger.error(log_msg)
    return

@router.get("/recent")
async def get_recent_logs(
    lines: int = Query(100, ge=1, le=1000),
    current_admin: User = Depends(get_current_admin),
):
    if not os.path.exists(LOG_FILE):
        return {"total_lines": 0, "recent_lines": []}
    try:
        total = 0
        recent: deque[str] = deque(maxlen=lines)
        with open(LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                total += 1
                recent.append(line)
        return {"total_lines": total, "recent_lines": list(recent)}
    except Exception:
        client_logger.exception("Failed to read the log file")
        return {"error": "Could not read the log file", "recent_lines": []}
