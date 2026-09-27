import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
)

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    color_hex: Mapped[str] = mapped_column(String(7), default="#10b981", nullable=False)
    
    posts: Mapped[list["Post"]] = relationship("Post", secondary=post_tags, back_populates="tags")

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="es", nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    upvotes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    author: Mapped["User"] = relationship("User", back_populates="posts")
    tags: Mapped[list[Tag]] = relationship("Tag", secondary=post_tags, back_populates="posts")
    upvotes: Mapped[list["Upvote"]] = relationship("Upvote", back_populates="post", cascade="all, delete-orphan")
    bookmarks: Mapped[list["Bookmark"]] = relationship("Bookmark", back_populates="post", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="post", cascade="all, delete-orphan", order_by="desc(Comment.created_at)")
