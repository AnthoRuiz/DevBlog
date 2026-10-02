"""AI drafts: post origin and metadata, cover credits, writer settings and run log

- posts.origin ("human" | "ai"), posts.ai_meta (JSONB) and posts.cover_credit (JSONB, Unsplash attribution)
- ai_writer_settings: single row with enabled, max_pending and the eligible sections (Mental Health excluded)
- ai_draft_runs: one row per generation run; a partial unique index keeps one scheduled run per day

Revision ID: 0009_ai_drafts
Revises: 0008_section_personality
Create Date: 2026-10-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_ai_drafts"
down_revision: Union[str, None] = "0008_section_personality"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("origin", sa.String(length=10), server_default="human", nullable=False))
    op.add_column("posts", sa.Column("ai_meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("posts", sa.Column("cover_credit", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.create_table(
        "ai_writer_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("max_pending", sa.Integer(), server_default="6", nullable=False),
        sa.Column("sections", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("""INSERT INTO ai_writer_settings (id, enabled, max_pending, sections) VALUES (1, true, 6, '["tech", "ai", "career", "gaming"]')""")

    op.create_table(
        "ai_draft_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("run_date", sa.Date(), nullable=False),
        sa.Column("trigger", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("post_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_draft_runs_run_date"), "ai_draft_runs", ["run_date"], unique=False)
    op.create_index(
        "uq_ai_draft_runs_scheduled_day", "ai_draft_runs", ["run_date"], unique=True,
        postgresql_where=sa.text("trigger = 'schedule'"),
    )


def downgrade() -> None:
    op.drop_index("uq_ai_draft_runs_scheduled_day", table_name="ai_draft_runs")
    op.drop_index(op.f("ix_ai_draft_runs_run_date"), table_name="ai_draft_runs")
    op.drop_table("ai_draft_runs")
    op.drop_table("ai_writer_settings")
    op.drop_column("posts", "cover_credit")
    op.drop_column("posts", "ai_meta")
    op.drop_column("posts", "origin")
