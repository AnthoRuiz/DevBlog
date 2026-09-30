"""reconcile legacy schema

Databases created by older versions of the app (via Base.metadata.create_all) drifted from the
models: bookmarks.user_id was NOT NULL, the anonymous-bookmark index and unique constraint were
missing, and posts.language had a server default. Every statement is idempotent, so on a database
created from 0001_baseline this migration changes nothing.

Revision ID: 0002_reconcile_legacy
Revises: 0001_baseline
Create Date: 2026-09-30
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_reconcile_legacy"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Anonymous bookmarks (client_hash, no user) must be allowed
    op.execute("ALTER TABLE bookmarks ALTER COLUMN user_id DROP NOT NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_bookmarks_client_hash ON bookmarks (client_hash)")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_client_post_bookmark') THEN
                -- Drop duplicates first so the constraint can be created
                DELETE FROM bookmarks a USING bookmarks b
                WHERE a.client_hash IS NOT NULL
                  AND a.client_hash = b.client_hash
                  AND a.post_id = b.post_id
                  AND a.id > b.id;
                ALTER TABLE bookmarks ADD CONSTRAINT uq_client_post_bookmark UNIQUE (client_hash, post_id);
            END IF;
        END $$;
        """
    )
    # The model sets the default in Python; drop the stray server default
    op.execute("ALTER TABLE posts ALTER COLUMN language DROP DEFAULT")


def downgrade() -> None:
    # Reconciliation only: nothing to undo
    pass
