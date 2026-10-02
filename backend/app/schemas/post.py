from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

from app.models.post import PostStatus

class SectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    description: str
    color_hex: str
    icon: str
    sort_order: int
    theme: str = "default"
    footer_markdown: str = ""

class SectionWithCount(SectionRead):
    post_count: int = 0

class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=255)
    color_hex: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    theme: Optional[str] = Field(None, pattern="^(default|calm|vivid)$")
    footer_markdown: Optional[str] = Field(None, max_length=4000)

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
    content_notice: Optional[str] = Field(None, max_length=300)
    language: str = "es"
    reading_time_minutes: Optional[int] = Field(default=None, ge=1)
    # True: publish (admins, trusted creators) or send to review (other creators). False: save as draft
    submit: bool = True
    section_id: uuid.UUID
    tag_ids: list[uuid.UUID] = []
    # Optional series (same section, owned by the user or any series for admins); appended at the end
    series_id: Optional[uuid.UUID] = None

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
    content_notice: Optional[str] = None
    language: str
    reading_time_minutes: int
    upvotes_count: int
    views_count: int
    status: PostStatus
    # "human" or "ai" (AI drafts until the admin adopts them; kept internally afterwards)
    origin: str = "human"
    # Unsplash attribution for the cover: {id, name, profile_url, photo_url}
    cover_credit: Optional[dict] = None
    review_note: Optional[str] = None
    featured_at: Optional[datetime] = None
    series_id: Optional[uuid.UUID] = None
    series_position: Optional[int] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    section: Optional[SectionRead] = None
    tags: list[TagRead] = []

class ReviewItem(PostRead):
    """A post waiting for admin review, with who wrote it."""
    author_name: Optional[str] = None
    # AI drafts: topic, sources, editor notes, providers (admin only)
    ai_meta: Optional[dict] = None


class IdeaSource(BaseModel):
    title: str = Field(..., max_length=300)
    url: str = Field(..., pattern=r"^https?://", max_length=1000)


class IdeaOutlineItem(BaseModel):
    heading: str = Field(..., max_length=200)
    guidance: str = Field(..., max_length=1000)
    prompts: list[str] = Field(default_factory=list, max_length=5)


class IdeaIngest(BaseModel):
    """An idea sent by an external generator (n8n, scheduled agents...) to POST /ideas/ingest."""
    title: str = Field(..., min_length=5, max_length=255)
    hook: str = Field(..., min_length=10, max_length=1500)
    language: str = Field(..., pattern="^(en|es)$")
    section_slug: str
    angles: list[str] = Field(default_factory=list, max_length=6)
    outline: list[IdeaOutlineItem] = Field(default_factory=list, max_length=8)
    questions: list[str] = Field(default_factory=list, max_length=6)
    experiment: str = Field("", max_length=1000)
    tags: list[str] = Field(default_factory=list, max_length=5)
    sources: list[IdeaSource] = Field(default_factory=list, max_length=10)
    cover_query: Optional[str] = Field(None, max_length=80)


class IdeaRead(BaseModel):
    id: uuid.UUID
    section_slug: str
    section_name: str
    section_color: str
    language: str
    title: str
    hook: str
    # angles, outline, questions, experiment, tags, providers (research notes are not sent)
    brief: dict
    sources: list[dict]
    cover_image_url: Optional[str] = None
    cover_credit: Optional[dict] = None
    status: str
    # like | unknown | dislike: the owner's reaction, fed back to the generator
    feedback: Optional[str] = None
    post_id: Optional[uuid.UUID] = None
    created_at: datetime


class WriterProfile(BaseModel):
    """What the owner knows, is learning and never wants suggested: ideas must fit it."""
    knows: list[str] = Field(default_factory=list, max_length=20)
    learning: list[str] = Field(default_factory=list, max_length=20)
    avoid: list[str] = Field(default_factory=list, max_length=20)
    notes: str = Field("", max_length=1000)


class IdeaSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    max_pending: Optional[int] = Field(None, ge=1, le=30)
    sections: Optional[list[str]] = None
    profile: Optional[WriterProfile] = None


class IdeaFeedback(BaseModel):
    value: str = Field(..., pattern="^(like|unknown|dislike)$")


class PostReject(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)


class HomeSection(BaseModel):
    section: SectionWithCount
    # The section's featured post, or its latest when none is featured
    lead: Optional[PostRead] = None
    rest: list[PostRead] = []


class HomePage(BaseModel):
    """Everything the magazine home needs in one response."""
    featured: Optional[PostRead] = None
    latest: list[PostRead] = []
    sections: list[HomeSection] = []


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

class SeriesNeighbor(BaseModel):
    slug: str
    title: str


class PostSeriesInfo(BaseModel):
    """Where a post sits in its series. Readers count published posts only."""
    id: uuid.UUID
    slug: str
    title: str
    position: int
    total: int
    prev: Optional[SeriesNeighbor] = None
    next: Optional[SeriesNeighbor] = None


class PostDetailRead(PostRead):
    content_markdown: str
    comments: list[CommentRead] = []
    series: Optional[PostSeriesInfo] = None


class SeriesCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field("", max_length=2000)
    section_id: uuid.UUID
    cover_image_url: Optional[str] = Field(None, max_length=500)


class SeriesUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    # Only while the series has no posts (every post must share the series' section)
    section_id: Optional[uuid.UUID] = None
    cover_image_url: Optional[str] = Field(None, max_length=500)


class SeriesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    slug: str
    description: str
    cover_image_url: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    section: SectionRead
    # Published posts for readers; every post in /series/mine
    post_count: int = 0


class SeriesDetail(SeriesRead):
    posts: list[PostRead] = []
    can_edit: bool = False


class SeriesOrder(BaseModel):
    post_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=200)

class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = Field(None, max_length=500)
    content_markdown: Optional[str] = None
    cover_image_url: Optional[str] = None
    # Empty string removes the notice
    content_notice: Optional[str] = Field(None, max_length=300)
    language: Optional[str] = None
    reading_time_minutes: Optional[int] = Field(None, ge=1)
    # Send null to take the post out of its series; leave it out to keep the series unchanged
    series_id: Optional[uuid.UUID] = None
    # True: publish or (re)submit for review; False: move back to draft; None: keep the status
    submit: Optional[bool] = None
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
