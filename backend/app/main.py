import asyncio
import secrets
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from slugify import slugify

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import engine, Base, AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.post import Tag, Post
from app.core.security import get_password_hash, verify_password
from app.core.logging import logger

# Password older versions seeded for the admin; detected so it can be rotated
LEGACY_ADMIN_PASSWORD = "admin123456"

# Starter tags seeded into an empty database: (name, slug, color)
DEFAULT_TAGS = [
    # Technology
    ("Software Engineering", "software-engineering", "#38bdf8"),
    ("Python", "python", "#10b981"),
    ("JavaScript & TypeScript", "javascript-typescript", "#facc15"),
    ("React", "react", "#818cf8"),
    ("Backend & APIs", "backend-apis", "#22c55e"),
    ("Databases", "databases", "#0ea5e9"),
    ("Distributed Systems", "distributed-systems", "#6366f1"),
    ("Cloud & DevOps", "cloud-devops", "#f59e0b"),
    ("Docker & Homelab", "docker-homelab", "#06b6d4"),
    ("Security", "security", "#ef4444"),
    ("AI & Machine Learning", "ai-machine-learning", "#a855f7"),
    # Career and interviews
    ("Interview Prep", "interview-prep", "#f97316"),
    ("System Design", "system-design", "#14b8a6"),
    ("Algorithms & Data Structures", "algorithms-data-structures", "#eab308"),
    ("Career Growth", "career-growth", "#84cc16"),
    # Wellbeing
    ("Mental Health", "mental-health", "#ec4899"),
    ("Productivity & Habits", "productivity-habits", "#f472b6"),
    # Gaming
    ("Video Games", "video-games", "#8b5cf6"),
    ("Game Development", "game-development", "#d946ef"),
]

async def seed_initial_data():
    """Seed starter tags and the admin user; demo posts only when SEED_DEMO_POSTS is enabled."""
    async with AsyncSessionLocal() as session:
        # 1. Initial tags
        existing_tags = await session.execute(select(Tag))
        if not existing_tags.scalars().first():
            session.add_all(Tag(name=name, slug=slug, color_hex=color) for name, slug, color in DEFAULT_TAGS)
            await session.flush()

        # 2. Default admin user
        admin_res = await session.execute(select(User).where(User.role == UserRole.ADMIN))
        admins = list(admin_res.scalars().all())
        admin = admins[0] if admins else None

        # Older installs seeded the admin with a publicly known password
        for existing_admin in admins:
            if existing_admin.hashed_password and verify_password(LEGACY_ADMIN_PASSWORD, existing_admin.hashed_password):
                if settings.ADMIN_PASSWORD:
                    existing_admin.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
                    logger.warning(f"[Seed] Default password of admin {existing_admin.email} rotated to ADMIN_PASSWORD")
                else:
                    logger.warning(
                        f"[Seed] INSECURE! Admin {existing_admin.email} still uses the default password. "
                        "Set ADMIN_PASSWORD in .env and restart to rotate it."
                    )

        if not admin:
            admin_password = settings.ADMIN_PASSWORD
            if not admin_password:
                admin_password = secrets.token_urlsafe(18)
                # stdout only (docker logs): it must never end up in server.log
                print(
                    f"[Seed] Initial admin created: {settings.ADMIN_EMAIL} / generated password: {admin_password}\n"
                    "[Seed] Save it now; it will not be shown again.",
                    flush=True,
                )
            admin = User(
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(admin_password),
                full_name="Software Engineer",
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(admin)
            await session.flush()

        # 3. Sample demo posts (development only: SEED_DEMO_POSTS=True)
        posts_res = await session.execute(select(Post))
        if settings.SEED_DEMO_POSTS and not posts_res.scalars().first():
            tag_res = await session.execute(select(Tag))
            all_tags = list(tag_res.scalars().all())

            p1 = Post(
                author_id=admin.id,
                slug="designing-eventually-consistent-cache",
                cover_image_url="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
                title="Designing an eventually consistent caching layer with Python and Docker",
                summary="How I structured a microservice cluster on my home PC and cut latency from 45ms to 2ms with reactive invalidation.",
                language="en",
                content_markdown="""# Designing an eventually consistent caching layer

In read-heavy distributed systems, the most predictable bottleneck is always PostgreSQL's on-disk persistence layer.

## 1. The Homelab Topology
To solve this without relying on managed cloud services, we implemented a read-through cache with asynchronous invalidation.

```python
async def fetch_article(slug: str) -> PostSchema:
    # 1. Try the in-memory cache first
    cached = await cache.get(f"post:{slug}")
    if cached:
        return PostSchema.model_validate_json(cached)
    
    # 2. Fall back to PostgreSQL
    post = await db.fetch_by_slug(slug)
    await cache.set(f"post:{slug}", post.model_dump_json(), ttl=3600)
    return post
```

## 2. Lessons Learned
* **Network isolation:** The database must never expose ports outside the host.
* **Resilience:** If the cache server restarts, the app must degrade gracefully to the database instead of failing.
""",
                reading_time_minutes=8,
                upvotes_count=142,
                views_count=1240,
                is_published=True,
                tags=[t for t in all_tags if t.slug in ["distributed-systems", "python", "docker-homelab"]]
            )

            p2 = Post(
                author_id=admin.id,
                slug="strict-typescript-react-19-type-inference",
                cover_image_url="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
                title="Strict TypeScript in React 19: Advanced type inference patterns",
                summary="How to structure components, custom hooks and end-to-end typed API calls without a single 'any'.",
                language="en",
                content_markdown="""# Strict TypeScript in React 19

The real value of TypeScript is not annotating every variable by hand, but designing generic contracts where the compiler infers return types for you.

## Contracts shared with the backend
Using Pydantic schemas in FastAPI, we generate the matching TypeScript definitions for React:

```typescript
export interface PostRead {
  id: string;
  slug: string;
  title: string;
  summary: string;
  reading_time_minutes: number;
  upvotes_count: number;
  tags: TagRead[];
}
```

This removes any mismatch between what the database stores and what the UI renders.
""",
                reading_time_minutes=6,
                upvotes_count=98,
                views_count=890,
                is_published=True,
                tags=[t for t in all_tags if t.slug in ["react", "javascript-typescript"]]
            )

            p3 = Post(
                author_id=admin.id,
                slug="self-hosting-cloudflare-tunnels-zero-open-ports",
                cover_image_url="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80",
                title="Self-hosting with Cloudflare Tunnels: Zero Open Ports",
                summary="Step-by-step guide to running your own secure web server behind an encrypted tunnel without exposing your home IP.",
                language="en",
                content_markdown="""# Self-hosting with Cloudflare Tunnels

Publishing a web server from a residential connection used to mean opening ports 80 and 443 on the router, dealing with a dynamic IP and putting the home network at risk.

## The modern approach: Cloudflare Tunnel (cloudflared)
An outbound tunnel opens the connection from inside the container to Cloudflare's data centers:

1. The home router needs no port forwarding rules.
2. Your home's public IP address stays 100% hidden.
3. TLS certificates and DDoS protection are applied at the edge.
""",
                reading_time_minutes=5,
                upvotes_count=114,
                views_count=1520,
                is_published=True,
                tags=[t for t in all_tags if t.slug in ["docker-homelab", "cloud-devops", "security"]]
            )

            session.add_all([p1, p2, p3])

        await session.commit()

async def automated_backup_scheduler():
    """Run an automatic daily backup (every 24 hours) in the background, with rotation."""
    while True:
        try:
            # Wait 24 hours (86400 seconds)
            await asyncio.sleep(86400)
            from app.services import backup_service
            res = await backup_service.create_backup(keep=7)
            print(f"[AutoBackup] Automatic backup succeeded: {res['filename']} ({res['size_display']})")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[AutoBackup] Automatic backup task failed: {e}")
            await asyncio.sleep(300)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed initial data
    await seed_initial_data()
    # Start the automatic backup scheduler
    backup_task = asyncio.create_task(automated_backup_scheduler())
    yield
    # Cleanup on shutdown
    backup_task.cancel()
    await engine.dispose()

# Do not publish the OpenAPI schema in production (/api/v1/openapi.json is reachable through Nginx)
_expose_docs = settings.ENVIRONMENT != "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if _expose_docs else None,
    docs_url="/docs" if _expose_docs else None,
    redoc_url="/redoc" if _expose_docs else None,
    lifespan=lifespan
)

# Rate limiting (SlowAPI)
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from fastapi import Request
from app.core.limiter import limiter

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests from your IP address. Please wait a moment and try again (rate limit exceeded)."
        }
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

from app.services.media_service import UPLOADS_DIR
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
