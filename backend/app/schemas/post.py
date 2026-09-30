from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

class SectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    description: str
    color_hex: str
    icon: str
    sort_order: int

class SectionWithCount(SectionRead):
    post_count: int = 0

class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=255)
    color_hex: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")

class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    color_hex: str
    section_id: uuid.UUID

class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color_hex: Optional[str] = "#38bdf8"
    # Section the tag belongs to; validated against the tag name (see services/tag_classifier.py)
    section_id: uuid.UUID
    # ADMIN only: create even if the classifier suggests another section
    force: bool = False

class TagValidateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    section_id: uuid.UUID

class TagValidateResponse(BaseModel):
    name: str
    # A tag with this name already exists and will simply be reused
    existing_tag: Optional[TagRead] = None
    suggested_section: Optional[SectionRead] = None
    matches_selected: bool
    blocked: bool
    confidence: float
    reason: str
    source: str

class PostBase(BaseModel):
    title: str = Field(..., max_length=255)
    summary: str = Field(..., max_length=500)
    content_markdown: str
    cover_image_url: Optional[str] = None
    language: str = "es"
    reading_time_minutes: Optional[int] = Field(default=None, ge=1)
    is_published: bool = True
    section_id: uuid.UUID
    tag_ids: list[uuid.UUID] = []

class PostCreate(PostBase):
    pass

class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    author_id: Optional[uuid.UUID] = None
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
    section: Optional[SectionRead] = None
    tags: list[TagRead] = []

class PostPage(BaseModel):
    """One page of posts plus what the client needs to request the next one."""
    items: list[PostRead]
    total: int
    limit: int
    offset: int
    has_more: bool

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    author_name: Optional[str] = Field("Dev Reader", max_length=100)
    hp_website: Optional[str] = Field(None, description="Honeypot anti-spam field, must remain empty")

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
    section_id: Optional[uuid.UUID] = None
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
    # LLM that produced them (e.g. "claude:claude-opus-5-5") or "keywords" for the offline fallback
    provider: str
    # Why the keyword fallback was used: not_configured | quota_exhausted | failed (None when an LLM answered)
    fallback_reason: Optional[str] = None

class AIStatusResponse(BaseModel):
    available: bool
    # Configured providers in failover order, e.g. ["claude", "gemini"]
    providers: list[str]
