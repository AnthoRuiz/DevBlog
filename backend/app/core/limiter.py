from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

def get_real_client_ip(request: Request) -> str:
    """
    Resolve the real client IP, honoring reverse-proxy headers
    (Nginx, Cloudflare Tunnel CF-Connecting-IP, X-Forwarded-For).
    """
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
        
    return get_remote_address(request) or "127.0.0.1"

# In-memory limiter for the FastAPI server
limiter = Limiter(key_func=get_real_client_ip, default_limits=["120/minute"])
