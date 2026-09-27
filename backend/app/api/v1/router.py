from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.posts import router as posts_router
from app.api.v1.stats import router as stats_router
from app.api.v1.logs import router as logs_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(posts_router)
api_router.include_router(stats_router)
api_router.include_router(logs_router)
