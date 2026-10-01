"""featured posts

Adds posts.featured_at (nullable). Featured posts lead their section; the API allows at most
two per section.

Revision ID: 0006_featured_posts
Revises: 0005_post_search
Create Date: 2026-10-01
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_featured_posts"
down_revision: Union[str, None] = "0005_post_search"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("featured_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_posts_featured_at"), "posts", ["featured_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_posts_featured_at"), table_name="posts")
    op.drop_column("posts", "featured_at")
