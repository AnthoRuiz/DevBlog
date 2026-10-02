"""post ideas: the daily AI job suggests topics instead of writing drafts

Creates post_ideas. AI drafts still waiting for review become ideas (title, summary as the hook,
sources, editor notes as questions, cover) and the drafts are deleted: from now on the AI only
researches and suggests, the admin writes. posts.origin/ai_meta stay for history.

Revision ID: 0010_post_ideas
Revises: 0009_ai_drafts
Create Date: 2026-10-02
"""
import json
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_post_ideas"
down_revision: Union[str, None] = "0009_ai_drafts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "post_ideas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language", sa.String(length=5), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("hook", sa.Text(), nullable=False),
        sa.Column("brief", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("sources", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("cover_image_url", sa.String(length=1000), nullable=True),
        sa.Column("cover_credit", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_post_ideas_section_id"), "post_ideas", ["section_id"], unique=False)
    op.create_index(op.f("ix_post_ideas_status"), "post_ideas", ["status"], unique=False)

    # Pending AI drafts become ideas; the AI-written text is dropped
    conn = op.get_bind()
    drafts = conn.execute(sa.text(
        "SELECT id, section_id, language, title, summary, ai_meta, cover_image_url, cover_credit, created_at "
        "FROM posts WHERE origin = 'ai' AND status = 'pending_review'"
    )).mappings().all()
    for d in drafts:
        meta = d["ai_meta"] or {}
        brief = {
            "angles": [],
            "outline": [],
            "questions": meta.get("editor_notes", []),
            "experiment": "",
            "tags": [],
            "research_notes": meta.get("research_notes", ""),
            "providers": meta.get("providers", {}),
        }
        conn.execute(
            sa.text(
                "INSERT INTO post_ideas (id, section_id, language, title, hook, brief, sources, cover_image_url, "
                "cover_credit, status, created_at) VALUES (:id, :section_id, :language, :title, :hook, "
                "CAST(:brief AS jsonb), CAST(:sources AS jsonb), :cover, CAST(:credit AS jsonb), 'new', :created_at)"
            ),
            {
                "id": uuid.uuid4(),
                "section_id": d["section_id"],
                "language": d["language"] if d["language"] in ("en", "es") else "en",
                "title": d["title"],
                "hook": d["summary"],
                "brief": json.dumps(brief),
                "sources": json.dumps(meta.get("sources", [])),
                "cover": d["cover_image_url"],
                "credit": json.dumps(d["cover_credit"]) if d["cover_credit"] else None,
                "created_at": d["created_at"],
            },
        )
    conn.execute(sa.text("DELETE FROM posts WHERE origin = 'ai' AND status = 'pending_review'"))


def downgrade() -> None:
    # Ideas cannot be turned back into AI-written drafts; they are dropped with the table
    op.drop_index(op.f("ix_post_ideas_status"), table_name="post_ideas")
    op.drop_index(op.f("ix_post_ideas_section_id"), table_name="post_ideas")
    op.drop_table("post_ideas")
