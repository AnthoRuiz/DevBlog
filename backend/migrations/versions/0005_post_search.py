"""full-text search over posts

Adds posts.search_vector, a stored generated tsvector over title (weight A), summary (B) and
content (C) with the `simple` configuration (no stemming, so Spanish and English posts both
match), and a GIN index on it.

Revision ID: 0005_post_search
Revises: 0004_roles_and_review
Create Date: 2026-10-01
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005_post_search"
down_revision: Union[str, None] = "0004_roles_and_review"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEARCH_VECTOR_SQL = (
    "setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') || "
    "setweight(to_tsvector('simple'::regconfig, coalesce(summary, '')), 'B') || "
    "setweight(to_tsvector('simple'::regconfig, coalesce(content_markdown, '')), 'C')"
)


def upgrade() -> None:
    op.execute(f"ALTER TABLE posts ADD COLUMN search_vector tsvector GENERATED ALWAYS AS ({SEARCH_VECTOR_SQL}) STORED")
    op.execute("CREATE INDEX ix_posts_search_vector ON posts USING gin (search_vector)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_posts_search_vector")
    op.execute("ALTER TABLE posts DROP COLUMN search_vector")
