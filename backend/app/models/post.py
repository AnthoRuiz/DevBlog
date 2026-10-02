import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, Table, Column, Computed, Index, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
)

class PostStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    REJECTED = "rejected"

class Section(Base):
    """Top-level blog section (e.g. Tech & Coding, Gaming). Every post and tag belongs to one."""
    __tablename__ = "sections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    color_hex: Mapped[str] = mapped_column(String(7), default="#22d3ee", nullable=False)
    # Icon key understood by the frontend (code, cpu, target, heart, gamepad)
    icon: Mapped[str] = mapped_column(String(40), default="code", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Visual personality: default | calm (softer, larger type) | vivid (section color accents)
    theme: Mapped[str] = mapped_column(String(20), default="default", server_default="default", nullable=False)
    # Admin-editable markdown shown below every post of the section (e.g. a disclaimer)
    footer_markdown: Mapped[str] = mapped_column(Text, default="", server_default="", nullable=False)

    tags: Mapped[list["Tag"]] = relationship("Tag", back_populates="section")
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="section")

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    color_hex: Mapped[str] = mapped_column(String(7), default="#10b981", nullable=False)
    section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False)

    section: Mapped[Section] = relationship("Section", back_populates="tags")
    posts: Mapped[list["Post"]] = relationship("Post", secondary=post_tags, back_populates="tags")

class Series(Base):
    """An ordered learning path of posts within one section, owned by the creator who made it."""
    __tablename__ = "series"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    section: Mapped[Section] = relationship("Section", lazy="selectin")
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="parent_series", order_by="Post.series_position")


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_posts_search_vector", "search_vector", postgresql_using="gin"),
        # Deferred so a reorder can swap positions inside one transaction
        UniqueConstraint("series_id", "series_position", name="uq_posts_series_position", deferrable=True, initially="DEFERRED"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="RESTRICT"), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="es", nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    # Optional notice shown before the body ("This post discusses anxiety and burnout")
    content_notice: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # "human" or "ai" (drafted by the AI writer); internal, never shown to readers
    origin: Mapped[str] = mapped_column(String(10), default="human", server_default="human", nullable=False)
    # AI drafts only: topic, research sources, editor notes, provider (admin review aid)
    ai_meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Photo attribution required for Unsplash covers: {name, profile_url, photo_url, id}
    cover_credit: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Full-text search (migration 0005): generated by Postgres, never written by the app
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') || "
            "setweight(to_tsvector('simple'::regconfig, coalesce(summary, '')), 'B') || "
            "setweight(to_tsvector('simple'::regconfig, coalesce(content_markdown, '')), 'C')",
            persisted=True,
        ),
        deferred=True,
    )
    cover_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    upvotes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Only PUBLISHED posts are public; creators' posts wait in PENDING_REVIEW unless they are trusted
    status: Mapped[PostStatus] = mapped_column(
        SQLEnum(PostStatus, name="poststatus", values_callable=lambda e: [m.value for m in e]),
        default=PostStatus.DRAFT, index=True, nullable=False,
    )
    # Reason given by the admin when a post is rejected
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Set while an admin features the post (max two per section, enforced in the API)
    featured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    # Optional series membership; positions are ordered but may have gaps
    series_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("series.id", ondelete="SET NULL"), index=True, nullable=True)
    series_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    author: Mapped["User"] = relationship("User", back_populates="posts")
    # Not named "series": PostDetailRead.series is the computed "part N of M" info
    parent_series: Mapped[Series | None] = relationship("Series", back_populates="posts")
    # Always loaded with the post: every API response that returns a post includes its section
    section: Mapped[Section] = relationship("Section", back_populates="posts", lazy="selectin")
    tags: Mapped[list[Tag]] = relationship("Tag", secondary=post_tags, back_populates="posts")
    upvotes: Mapped[list["Upvote"]] = relationship("Upvote", back_populates="post", cascade="all, delete-orphan")
    bookmarks: Mapped[list["Bookmark"]] = relationship("Bookmark", back_populates="post", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="post", cascade="all, delete-orphan", order_by="desc(Comment.created_at)")
