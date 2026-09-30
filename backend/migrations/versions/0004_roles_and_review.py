"""two roles (ADMIN, CREATOR) and post review workflow

- userrole: AUTHOR is renamed to CREATOR, READER accounts become CREATOR and READER is removed
  (Postgres cannot drop an enum value, so the type is rebuilt). Anonymous visitors are the readers.
- users.is_trusted: trusted creators publish without review.
- posts.status (draft | pending_review | published | rejected) replaces is_published, plus
  posts.review_note for rejection reasons. Published posts stay published, the rest become drafts.

Downgrade restores READER/AUTHOR (former readers cannot be told apart and come back as AUTHOR)
and is_published (true only for published posts).

Revision ID: 0004_roles_and_review
Revises: 0003_add_sections
Create Date: 2026-09-30
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_roles_and_review"
down_revision: Union[str, None] = "0003_add_sections"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

POST_STATUSES = ("draft", "pending_review", "published", "rejected")


def upgrade() -> None:
    # Roles: AUTHOR -> CREATOR, READER -> CREATOR, then rebuild the type without READER
    op.execute("ALTER TYPE userrole RENAME VALUE 'AUTHOR' TO 'CREATOR'")
    op.execute("UPDATE users SET role = 'CREATOR' WHERE role = 'READER'")
    op.execute("CREATE TYPE userrole_v2 AS ENUM ('ADMIN', 'CREATOR')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole_v2 USING role::text::userrole_v2")
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_v2 RENAME TO userrole")

    op.add_column("users", sa.Column("is_trusted", sa.Boolean(), server_default=sa.text("false"), nullable=False))

    # Post status replaces is_published
    status_type = sa.Enum(*POST_STATUSES, name="poststatus")
    status_type.create(op.get_bind())
    op.add_column("posts", sa.Column("status", status_type, server_default="draft", nullable=False))
    op.add_column("posts", sa.Column("review_note", sa.Text(), nullable=True))
    op.execute("UPDATE posts SET status = CASE WHEN is_published THEN 'published'::poststatus ELSE 'draft'::poststatus END")
    op.alter_column("posts", "status", server_default=None)
    op.create_index(op.f("ix_posts_status"), "posts", ["status"], unique=False)
    op.drop_index(op.f("ix_posts_is_published"), table_name="posts")
    op.drop_column("posts", "is_published")


def downgrade() -> None:
    op.add_column("posts", sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.execute("UPDATE posts SET is_published = (status = 'published')")
    op.alter_column("posts", "is_published", server_default=None)
    op.create_index(op.f("ix_posts_is_published"), "posts", ["is_published"], unique=False)
    op.drop_index(op.f("ix_posts_status"), table_name="posts")
    op.drop_column("posts", "review_note")
    op.drop_column("posts", "status")
    sa.Enum(name="poststatus").drop(op.get_bind())

    op.drop_column("users", "is_trusted")

    op.execute("CREATE TYPE userrole_v1 AS ENUM ('ADMIN', 'AUTHOR', 'READER')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE userrole_v1 "
        "USING (CASE role::text WHEN 'CREATOR' THEN 'AUTHOR' ELSE role::text END)::userrole_v1"
    )
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_v1 RENAME TO userrole")
