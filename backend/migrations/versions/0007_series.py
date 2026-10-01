"""series / learning paths

Adds the series table (one section per series, owned by its creator) and posts.series_id +
posts.series_position with a deferrable unique constraint on (series_id, series_position), so
reordering can swap positions inside one transaction.

Revision ID: 0007_series
Revises: 0006_featured_posts
Create Date: 2026-10-01
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_series"
down_revision: Union[str, None] = "0006_featured_posts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "series",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cover_image_url", sa.String(length=500), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_series_slug"), "series", ["slug"], unique=True)
    op.create_index(op.f("ix_series_section_id"), "series", ["section_id"], unique=False)
    op.create_index(op.f("ix_series_created_by"), "series", ["created_by"], unique=False)

    op.add_column("posts", sa.Column("series_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("posts", sa.Column("series_position", sa.Integer(), nullable=True))
    op.create_foreign_key("posts_series_id_fkey", "posts", "series", ["series_id"], ["id"], ondelete="SET NULL")
    op.create_index(op.f("ix_posts_series_id"), "posts", ["series_id"], unique=False)
    op.create_unique_constraint(
        "uq_posts_series_position", "posts", ["series_id", "series_position"], deferrable=True, initially="DEFERRED"
    )


def downgrade() -> None:
    op.drop_constraint("uq_posts_series_position", "posts", type_="unique")
    op.drop_index(op.f("ix_posts_series_id"), table_name="posts")
    op.drop_constraint("posts_series_id_fkey", "posts", type_="foreignkey")
    op.drop_column("posts", "series_position")
    op.drop_column("posts", "series_id")
    op.drop_index(op.f("ix_series_created_by"), table_name="series")
    op.drop_index(op.f("ix_series_section_id"), table_name="series")
    op.drop_index(op.f("ix_series_slug"), table_name="series")
    op.drop_table("series")
