from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "DevBlog Homelab API"
    
    # Base de datos
    DATABASE_URL: str = "postgresql+asyncpg://devblog_user:devblog_secure_pass_2026@localhost:5432/devblog"
    
    # JWT
    SECRET_KEY: str = "devblog_insecure_default_secret_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 horas

    # Selector de rol para pruebas (PUT /auth/me/role). Nunca activar en un despliegue público:
    # permite que cualquier usuario autenticado se asigne el rol ADMIN.
    ALLOW_ROLE_SELF_SWITCH: bool = False

    # Admin inicial sembrado al arrancar con la base de datos vacía.
    # Si ADMIN_PASSWORD no está definida se genera una aleatoria y se imprime una sola vez en stdout.
    ADMIN_EMAIL: str = "admin@devblog.local"
    ADMIN_PASSWORD: Optional[str] = None

    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None

    # Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
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
