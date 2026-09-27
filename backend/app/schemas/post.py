from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    color_hex: str

class PostBase(BaseModel):
    title: str = Field(..., max_length=255)
    summary: str = Field(..., max_length=500)
    content_markdown: str
    cover_image_url: Optional[str] = None
    language: str = "es"
    reading_time_minutes: int = Field(default=5, ge=1)
    is_published: bool = True
    tag_ids: list[uuid.UUID] = []

class PostCreate(PostBase):
    pass

class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    slug: str
    title: str
    summary: str
    cover_image_url: Optional[str] = None
    language: str
    reading_time_minutes: int
    upvotes_count: int
    views_count: int
    is_published: bool
    published_at: Optional[datetime] = None
    created_at: datetime
    tags: list[TagRead] = []

class PostDetailRead(PostRead):
    content_markdown: str

class UpvoteResponse(BaseModel):
    post_id: uuid.UUID
    upvoted: bool
    new_upvotes_count: int
