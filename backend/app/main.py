import asyncio
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
from app.core.security import get_password_hash

async def seed_initial_data():
    """Siembra datos iniciales (tags, usuario admin y posts de ejemplo) si la base de datos está vacía."""
    async with AsyncSessionLocal() as session:
        # 1. Tags iniciales
        existing_tags = await session.execute(select(Tag))
        if not existing_tags.scalars().first():
            default_tags = [
                Tag(name="Sistemas Distribuidos", slug="distributed-systems", color_hex="#38bdf8"),
                Tag(name="Python & FastAPI", slug="python-fastapi", color_hex="#10b981"),
                Tag(name="React & TypeScript", slug="react-typescript", color_hex="#818cf8"),
                Tag(name="Docker & Homelab", slug="docker-homelab", color_hex="#06b6d4"),
                Tag(name="Cloud & AWS", slug="cloud-aws", color_hex="#f59e0b"),
            ]
            session.add_all(default_tags)
            await session.flush()

        # 2. Usuario admin por defecto
        admin_res = await session.execute(select(User).where(User.role == UserRole.ADMIN))
        admin = admin_res.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@devblog.local",
                hashed_password=get_password_hash("admin123456"),
                full_name="Software Engineer",
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(admin)
            await session.flush()

        # 3. Posts iniciales de demostración
        posts_res = await session.execute(select(Post))
        if not posts_res.scalars().first():
            tag_res = await session.execute(select(Tag))
            all_tags = list(tag_res.scalars().all())

            p1 = Post(
                author_id=admin.id,
                slug="disenando-cache-consistencia-eventual",
                title="Diseñando un sistema de caching con consistencia eventual en Python y Docker",
                summary="Cómo estructuré un cluster de microservicios en mi PC de casa reduciendo latencias de 45ms a 2ms con invalidación reactiva.",
                content_markdown="""# Diseñando un sistema de caching con consistencia eventual

Al desarrollar sistemas distribuidos de lectura intensiva, el cuello de botella más predecible siempre reside en la capa de persistencia en disco de PostgreSQL.

## 1. La Topología Homelab
Para resolver este desafío sin depender de servicios gestionados en la nube, implementamos un patrón de caché de lectura directa con invalidación asíncrona.

```python
async def fetch_article(slug: str) -> PostSchema:
    # 1. Intento de lectura en memoria
    cached = await cache.get(f"post:{slug}")
    if cached:
        return PostSchema.model_validate_json(cached)
    
    # 2. Fallback a PostgreSQL
    post = await db.fetch_by_slug(slug)
    await cache.set(f"post:{slug}", post.model_dump_json(), ttl=3600)
    return post
```

## 2. Lecciones Aprendidas
* **Aislamiento de red:** La base de datos nunca debe exponer puertos hacia fuera del host.
* **Resiliencia:** Si el servidor de caché se reinicia, la aplicación debe degradarse elegantemente hacia la base de datos sin fallar.
""",
                reading_time_minutes=8,
                upvotes_count=142,
                views_count=1240,
                is_published=True,
                tags=[t for t in all_tags if t.slug in ["distributed-systems", "python-fastapi", "docker-homelab"]]
            )

            p2 = Post(
                author_id=admin.id,
                slug="typescript-estricto-react-19-server-actions",
                title="TypeScript estricto en React 19: Patrones avanzados de inferencia de tipos",
                summary="Cómo estructurar componentes, hooks personalizados y llamadas tipadas de punta a punta sin usar 'any' ni una sola vez.",
                content_markdown="""# TypeScript estricto en React 19

El verdadero valor de TypeScript no radica en tipear manualmente cada variable, sino en diseñar contratos genéricos donde el compilador infiera automáticamente los tipos de retorno.

## Contratos compartidos con el Backend
Al utilizar esquemas Pydantic en FastAPI, generamos automáticamente las definiciones de TypeScript en React:

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

Esto elimina discrepancias entre lo que la base de datos almacena y lo que la interfaz de usuario renderiza.
""",
                reading_time_minutes=6,
                upvotes_count=98,
                views_count=890,
                is_published=True,
                tags=[t for t in all_tags if t.slug in ["react-typescript", "python-fastapi"]]
            )

            p3 = Post(
                author_id=admin.id,
                slug="desplegando-en-casa-tuneles-cloudflare-cero-puertos",
                title="Desplegando en casa con Túneles de Cloudflare: Cero Puertos Abiertos",
                summary="Guía paso a paso para configurar tu propio servidor web seguro detrás de un túnel cifrado sin exponer la IP pública de tu hogar.",
                content_markdown="""# Desplegando en casa con Túneles de Cloudflare

Publicar un servidor web desde una conexión de internet residencial solía requerir abrir los puertos 80 y 443 en el router, lidiar con IP dinámica y arriesgar la seguridad de la red doméstica.

## El enfoque moderno: Cloudflare Tunnel (cloudflared)
Un túnel saliente inicia la conexión desde el interior del contenedor hacia los datacenters de Cloudflare:

1. El router residencial no requiere ninguna regla de reenvío de puertos (*Port Forwarding*).
2. La dirección IP pública de tu hogar permanece 100% oculta.
3. El certificado SSL y la protección contra ataques DDoS se aplican en el Edge.
""",
                reading_time_minutes=5,
                upvotes_count=114,
                views_count=1520,
                is_published=True,
                tags=[t for t in all_tags if t.slug in ["docker-homelab", "cloud-aws"]]
            )

            session.add_all([p1, p2, p3])

        await session.commit()

async def automated_backup_scheduler():
    """Ejecuta un backup diario automático (cada 24 horas) en segundo plano con rotación."""
    while True:
        try:
            # Esperar 24 horas (86400 segundos)
            await asyncio.sleep(86400)
            from app.services import backup_service
            res = await backup_service.create_backup(keep=7)
            print(f"[AutoBackup] Backup automático exitoso: {res['filename']} ({res['size_display']})")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[AutoBackup] Error en tarea de backup automático: {e}")
            await asyncio.sleep(300)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas automáticamente al arrancar
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Sembrar datos iniciales
    await seed_initial_data()
    # Iniciar programador de backups automáticos
    backup_task = asyncio.create_task(automated_backup_scheduler())
    yield
    # Limpieza al apagar
    backup_task.cancel()
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configuración de Rate Limiting (SlowAPI)
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
            "detail": "Demasiadas peticiones desde tu dirección IP. Por favor espera un momento antes de volver a intentarlo (Rate Limit Exceeded)."
        }
    )

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles

uploads_dir = "/app/uploads" if os.path.exists("/app/uploads") else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Registrar rutas
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
