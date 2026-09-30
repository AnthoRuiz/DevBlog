from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.posts import router as posts_router
from app.api.v1.stats import router as stats_router, site_router
from app.api.v1.logs import router as logs_router
from app.api.v1.backups import router as backups_router
from app.api.v1.media import router as media_router
from app.api.v1.sections import router as sections_router
from app.api.v1.review import router as review_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(posts_router)
api_router.include_router(stats_router)
api_router.include_router(site_router)
api_router.include_router(logs_router)
api_router.include_router(backups_router)
api_router.include_router(media_router)
api_router.include_router(sections_router)
api_router.include_router(review_router)
