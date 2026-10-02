import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

DEFAULT_AI_SECTIONS = ["tech", "ai", "career", "gaming"]


class AIWriterSettings(Base):
    """Single row (id=1) of admin-editable settings for the daily AI drafts."""
    __tablename__ = "ai_writer_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), nullable=False)
    # Generation stops while this many AI drafts wait for review
    max_pending: Mapped[int] = mapped_column(Integer, default=6, server_default="6", nullable=False)
    # Section slugs the writer may pick from
    sections: Mapped[list] = mapped_column(JSONB, default=lambda: list(DEFAULT_AI_SECTIONS), nullable=False)
    # What the owner knows, likes, wants to learn and avoids: {knows: [], learning: [], avoid: [], notes}
    profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class AIDraftRun(Base):
    """One generation run: scheduled (at most one per day), retry or manual."""
    __tablename__ = "ai_draft_runs"
    __table_args__ = (
        # Guarantees a single scheduled run per day even across restarts or several workers
        Index("uq_ai_draft_runs_scheduled_day", "run_date", unique=True, postgresql_where=text("trigger = 'schedule'")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    trigger: Mapped[str] = mapped_column(String(20), nullable=False)  # schedule | retry | manual
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # running | succeeded | partial | failed | skipped
    detail: Mapped[str] = mapped_column(Text, default="", nullable=False)
    post_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
