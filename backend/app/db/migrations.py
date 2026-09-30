"""Apply Alembic migrations on startup.

Databases created before Alembic was introduced already hold the baseline tables but no
alembic_version table; they are stamped at the baseline first so only later migrations run.
"""
import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.logging import logger

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
BASELINE_REVISION = "0001_baseline"


def _alembic_config() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.attributes["skip_logging_config"] = True
    return cfg


async def _is_legacy_database() -> bool:
    """True when the app tables exist but Alembic has never run on this database."""
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            has_version = (await conn.execute(text("SELECT to_regclass('public.alembic_version')"))).scalar()
            has_users = (await conn.execute(text("SELECT to_regclass('public.users')"))).scalar()
        return has_users is not None and has_version is None
    finally:
        await engine.dispose()


def run_migrations() -> None:
    """Blocking: run it in a worker thread (env.py starts its own event loop)."""
    cfg = _alembic_config()
    if asyncio.run(_is_legacy_database()):
        logger.warning(f"[Migrations] Existing database without migration history: stamping {BASELINE_REVISION}")
        command.stamp(cfg, BASELINE_REVISION)
    command.upgrade(cfg, "head")
    logger.info("[Migrations] Database schema is up to date")
