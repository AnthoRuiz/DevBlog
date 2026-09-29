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

    # Base de datos: sin credenciales por defecto. DATABASE_URL se construye a partir de los
    # componentes escapando usuario y contraseña (admite caracteres como @ : / # %),
    # salvo que se proporcione DATABASE_URL completa.
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
            raise ValueError("Define POSTGRES_PASSWORD (o DATABASE_URL) en el entorno / .env")
        return self

    # JWT: obligatoria, sin valor por defecto
    SECRET_KEY: str
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

# Claves publicadas en el repositorio: cualquiera podría firmar JWT válidos con ellas
_PUBLIC_SECRET_KEYS = {
    "devblog_insecure_default_secret_key_change_in_production_2026",
    "change_this_to_a_secure_random_key_in_production_2026",
}

def _validate_security_settings(s: Settings) -> None:
    insecure_key = s.SECRET_KEY in _PUBLIC_SECRET_KEYS or len(s.SECRET_KEY) < 32
    if s.ENVIRONMENT == "production":
        problems = []
        if insecure_key:
            problems.append("SECRET_KEY es un valor por defecto o tiene menos de 32 caracteres")
        if s.ALLOW_ROLE_SELF_SWITCH:
            problems.append("ALLOW_ROLE_SELF_SWITCH=True permite escalar a ADMIN")
        if problems:
            raise RuntimeError("Configuración insegura para producción: " + "; ".join(problems))
    elif insecure_key:
        print("[Config] AVISO: SECRET_KEY insegura. Genera una con: openssl rand -hex 32", flush=True)

_validate_security_settings(settings)
