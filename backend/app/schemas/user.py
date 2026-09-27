from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional
import uuid
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: str
    full_name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: uuid.UUID
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

class LoginRequest(BaseModel):
    email: str
    password: str

class OAuthLoginRequest(BaseModel):
    provider: str # 'google', 'facebook'
    id_token: str # Token JWT retornado por Google Identity Services o Facebook SDK
