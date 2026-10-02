"""writer profile and idea feedback; Mental Health section removed

- ai_writer_settings.profile (JSONB): what the owner knows, likes, wants to learn and avoids; every
  idea must fit it. Seeded with his answers (2026-10-02).
- post_ideas.feedback ("like" | "unknown" | "dislike"): teaches the idea generator his taste.
- The Mental Health section is removed with its posts, series, tags and ideas (the owner decided
  he does not write about it). Production had no posts in it.

Revision ID: 0011_writer_profile
Revises: 0010_post_ideas
Create Date: 2026-10-02
"""
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_writer_profile"
down_revision: Union[str, None] = "0010_post_ideas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_PROFILE = {
    "knows": [
        "Video games: Escape from Tarkov, Counter-Strike (CS2), Valheim",
        "Data structures and algorithms",
        "Technical interview exercises (coding interview problems)",
        "The STAR method for behavioral interviews",
        "Helping people prepare for interviews in tech",
        "The stack he built this blog with in his homelab: Python, FastAPI, PostgreSQL, Docker and Docker Compose, React + TypeScript, Cloudflare Tunnel",
    ],
    "learning": [
        "AWS services: he uses them at work but is not an expert and wants to learn more (frame it as learning in public, never internal employer details)",
    ],
    "avoid": [
        "Mental health",
        "Topics he has no hands-on experience with and no interest in learning",
        "Internal details of any employer",
    ],
    "notes": "Prefer topics where he can add his own experience, opinion or a homelab test.",
}


def upgrade() -> None:
    op.add_column("ai_writer_settings", sa.Column("profile", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.execute(sa.text("UPDATE ai_writer_settings SET profile = CAST(:p AS jsonb)").bindparams(p=json.dumps(DEFAULT_PROFILE)))
    op.add_column("post_ideas", sa.Column("feedback", sa.String(length=10), nullable=True))

    # Remove the Mental Health section and everything in it
    section = "(SELECT id FROM sections WHERE slug = 'mental-health')"
    op.execute(f"DELETE FROM post_ideas WHERE section_id = {section}")
    op.execute(f"DELETE FROM posts WHERE section_id = {section}")  # comments, votes, bookmarks, post_tags cascade
    op.execute(f"DELETE FROM series WHERE section_id = {section}")
    op.execute(f"DELETE FROM tags WHERE section_id = {section}")
    op.execute("DELETE FROM sections WHERE slug = 'mental-health'")
    op.execute(
        """UPDATE ai_writer_settings SET sections = COALESCE(
               (SELECT jsonb_agg(s) FROM jsonb_array_elements_text(sections) s WHERE s <> 'mental-health'), '[]'::jsonb)"""
    )


def downgrade() -> None:
    # The section comes back empty (its posts are not restored)
    op.execute(
        """INSERT INTO sections (id, name, slug, description, color_hex, icon, sort_order, theme, footer_markdown)
           SELECT gen_random_uuid(), 'Mental Health', 'mental-health', 'Wellbeing, balance and healthy habits in tech',
                  '#f472b6', 'heart', 4, 'calm', ''
           WHERE NOT EXISTS (SELECT 1 FROM sections WHERE slug = 'mental-health')"""
    )
    op.drop_column("post_ideas", "feedback")
    op.drop_column("ai_writer_settings", "profile")
