from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import Optional
from urllib.parse import quote
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "DevBlog Homelab API"

    # Database: no default credentials. DATABASE_URL is built from the components with the
    # user and password percent-encoded (so characters like @ : / # % are safe),
    # unless a full DATABASE_URL is provided.
    DATABASE_URL: Optional[str] = None
    POSTGRES_USER: str = "devblog_user"
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "devblog"

    @model_validator(mode="after")
    def _build_database_url(self) -> "Settings":
        if self.POSTGRES_PASSWORD:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{quote(self.POSTGRES_USER, safe='')}:{quote(self.POSTGRES_PASSWORD, safe='')}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        elif not self.DATABASE_URL:
            raise ValueError("Set POSTGRES_PASSWORD (or DATABASE_URL) in the environment / .env")
        return self

    # JWT: required, no default
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours

    # Test role switcher (PUT /auth/me/role). Never enable on a public deployment:
    # it lets any authenticated user grant themselves the ADMIN role.
    ALLOW_ROLE_SELF_SWITCH: bool = False

    # Initial admin seeded on startup when no ADMIN exists.
    # If ADMIN_PASSWORD is unset, a random password is generated and printed once to stdout.
    ADMIN_EMAIL: str = "admin@devblog.local"
    ADMIN_PASSWORD: Optional[str] = None

    # Seed the three demo posts into an empty database (development only)
    SEED_DEMO_POSTS: bool = False

    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None

    # AI providers (see services/llm.py). Tried in LLM_PROVIDER_ORDER; providers without a key are skipped.
    ANTHROPIC_API_KEY: Optional[str] = None
    CLAUDE_MODEL: str = "claude-opus-5-5"
    GEMINI_API_KEY: Optional[str] = None
    # One or more models (comma-separated), tried in order; "-latest" aliases survive model retirements
    GEMINI_MODEL: str = "gemini-flash-latest,gemini-flash-lite-latest"
    LLM_PROVIDER_ORDER: str = "claude,gemini"
    
    # Site identity (personal brand book), shared by the frontend, RSS feeds and social previews
    SITE_NAME: str = "Anthony Ruiz"
    SITE_TAGLINE: str = "I build it at home before I trust it at scale."
    SITE_DESCRIPTION: str = (
        "Software engineer in security. I build distributed systems in my homelab and write about what breaks."
    )
    SITE_URL: str = "https://blog.anthoruiz.dev"

    # AI drafts (services/ai_writer.py): two drafts a day, researched on the web, waiting for admin review
    AI_DRAFTS_TIME: str = "16:00"
    AI_DRAFTS_TIMEZONE: str = "America/Los_Angeles"
    # Account that authors AI drafts until the admin adopts them (no password: it cannot sign in)
    AI_WRITER_EMAIL: str = "ai-writer@blog.internal"
    # Optional key for external generators posting to POST /ai-drafts/ingest (disabled when unset)
    AI_DRAFTS_API_KEY: Optional[str] = None
    # Unsplash cover images for AI drafts (only the Access Key is needed)
    UNSPLASH_ACCESS_KEY: Optional[str] = None

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://anthoruiz.dev",
        "https://www.anthoruiz.dev",
        "https://blog.anthoruiz.dev",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()

# Keys published in the repository: anyone could sign valid JWTs with them
_PUBLIC_SECRET_KEYS = {
    "devblog_insecure_default_secret_key_change_in_production_2026",
    "change_this_to_a_secure_random_key_in_production_2026",
}

def _validate_security_settings(s: Settings) -> None:
    insecure_key = s.SECRET_KEY in _PUBLIC_SECRET_KEYS or len(s.SECRET_KEY) < 32
    if s.ENVIRONMENT == "production":
        problems = []
        if insecure_key:
            problems.append("SECRET_KEY is a published default or shorter than 32 characters")
        if s.ALLOW_ROLE_SELF_SWITCH:
            problems.append("ALLOW_ROLE_SELF_SWITCH=True allows escalating to ADMIN")
        if problems:
            raise RuntimeError("Insecure configuration for production: " + "; ".join(problems))
    elif insecure_key:
        print("[Config] WARNING: insecure SECRET_KEY. Generate one with: openssl rand -hex 32", flush=True)

_validate_security_settings(settings)
