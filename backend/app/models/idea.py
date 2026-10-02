import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PostIdea(Base):
    """A researched topic suggestion for the admin to write about (the AI never writes the post)."""
    __tablename__ = "post_ideas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), index=True, nullable=False)
    # Language the post would be written in ("en" or "es"); the card is in that language too
    language: Mapped[str] = mapped_column(String(5), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Why the topic matters now (2-3 sentences)
    hook: Mapped[str] = mapped_column(Text, nullable=False)
    # {angles: [], outline: [{heading, guidance, prompts: []}], questions: [], experiment, tags: [], research_notes, providers}
    brief: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    sources: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    cover_credit: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # new | started | dismissed
    status: Mapped[str] = mapped_column(String(20), default="new", index=True, nullable=False)
    # The owner's reaction: like | unknown | dislike (used as examples for future ideas)
    feedback: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # The draft created by "Start writing"
    post_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
