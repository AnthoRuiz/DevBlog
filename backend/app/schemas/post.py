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

class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color_hex: Optional[str] = "#38bdf8"

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

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    author_name: Optional[str] = Field("Dev Reader", max_length=100)

class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    post_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    author_name: str
    content: str
    created_at: datetime

class PostDetailRead(PostRead):
    content_markdown: str
    comments: list[CommentRead] = []

class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = Field(None, max_length=500)
    content_markdown: Optional[str] = None
    cover_image_url: Optional[str] = None
    language: Optional[str] = None
    reading_time_minutes: Optional[int] = Field(None, ge=1)
    is_published: Optional[bool] = None
    tag_ids: Optional[list[uuid.UUID]] = None

class UpvoteResponse(BaseModel):
    post_id: uuid.UUID
    upvoted: bool
    new_upvotes_count: int

class BookmarkToggleResponse(BaseModel):
    post_id: uuid.UUID
    is_bookmarked: bool

class PostTranslateRequest(BaseModel):
    title: str = Field(..., max_length=255)
    summary: str = Field(..., max_length=1000)
    content_markdown: str
    target_lang: str = Field(..., pattern="^(es|en|pt|fr)$")
    source_lang: Optional[str] = "es"

class PostTranslateResponse(BaseModel):
    title: str
    summary: str
    content_markdown: str
    target_lang: str
    provider: str

class TagSuggestRequest(BaseModel):
    title: str = Field(..., max_length=255)
    summary: Optional[str] = Field("", max_length=1000)
    content_markdown: Optional[str] = ""

class TagSuggestResponse(BaseModel):
    suggested_tags: list[str]
