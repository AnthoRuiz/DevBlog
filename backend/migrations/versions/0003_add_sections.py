"""add sections

Adds the sections table, links every tag and post to a section and makes the link required.
Existing tags are assigned from the starter-tag mapping (unknown tags go to Tech & Coding);
existing posts take the most common section among their tags (or Tech & Coding).

Revision ID: 0003_add_sections
Revises: 0002_reconcile_legacy
Create Date: 2026-09-30
"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_sections"
down_revision: Union[str, None] = "0002_reconcile_legacy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_SECTION = "tech"

# slug, name, description, color, icon, sort order
SECTIONS = [
    ("tech", "Tech & Coding", "Software engineering, backend, cloud and homelab", "#22d3ee", "code", 1),
    ("ai", "AI", "Machine learning, LLMs and building with AI", "#a78bfa", "cpu", 2),
    ("career", "Interviews & Career", "Interview prep, system design and career growth", "#fb923c", "target", 3),
    ("mental-health", "Mental Health", "Wellbeing, balance and healthy habits in tech", "#f472b6", "heart", 4),
    ("gaming", "Gaming", "Video games and game development", "#4ade80", "gamepad", 5),
]

TAG_SECTIONS = {
    "ai": ["ai-machine-learning"],
    "career": ["interview-prep", "system-design", "algorithms-data-structures", "career-growth"],
    "mental-health": ["mental-health", "productivity-habits"],
    "gaming": ["video-games", "game-development"],
}


def upgrade() -> None:
    sections = op.create_table(
        "sections",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("color_hex", sa.String(length=7), nullable=False),
        sa.Column("icon", sa.String(length=40), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_sections_slug"), "sections", ["slug"], unique=True)
    op.bulk_insert(
        sections,
        [
            {"id": uuid.uuid4(), "slug": slug, "name": name, "description": desc, "color_hex": color, "icon": icon, "sort_order": order}
            for slug, name, desc, color, icon, order in SECTIONS
        ],
    )

    op.add_column("tags", sa.Column("section_id", sa.UUID(), nullable=True))
    op.add_column("posts", sa.Column("section_id", sa.UUID(), nullable=True))

    bind = op.get_bind()
    for section_slug, tag_slugs in TAG_SECTIONS.items():
        bind.execute(
            sa.text("UPDATE tags SET section_id = (SELECT id FROM sections WHERE slug = :s) WHERE slug = ANY(:tags)"),
            {"s": section_slug, "tags": tag_slugs},
        )
    bind.execute(
        sa.text("UPDATE tags SET section_id = (SELECT id FROM sections WHERE slug = :s) WHERE section_id IS NULL"),
        {"s": DEFAULT_SECTION},
    )
    # Each post goes to the most common section among its tags (ties broken deterministically)
    bind.execute(
        sa.text(
            """
            UPDATE posts p SET section_id = (
                SELECT t.section_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id
                GROUP BY t.section_id
                ORDER BY count(*) DESC, t.section_id
                LIMIT 1
            )
            """
        )
    )
    bind.execute(
        sa.text("UPDATE posts SET section_id = (SELECT id FROM sections WHERE slug = :s) WHERE section_id IS NULL"),
        {"s": DEFAULT_SECTION},
    )

    for table in ("tags", "posts"):
        op.alter_column(table, "section_id", nullable=False)
        op.create_index(op.f(f"ix_{table}_section_id"), table, ["section_id"], unique=False)
        op.create_foreign_key(f"{table}_section_id_fkey", table, "sections", ["section_id"], ["id"], ondelete="RESTRICT")


def downgrade() -> None:
    for table in ("posts", "tags"):
        op.drop_constraint(f"{table}_section_id_fkey", table, type_="foreignkey")
        op.drop_index(op.f(f"ix_{table}_section_id"), table_name=table)
        op.drop_column(table, "section_id")
    op.drop_index(op.f("ix_sections_slug"), table_name="sections")
    op.drop_table("sections")
