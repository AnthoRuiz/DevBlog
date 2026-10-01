"""section personality: theme, footer and content notices

- sections.theme: default | calm | vivid (Mental Health starts as calm)
- sections.footer_markdown: admin-editable text shown below every post of the section; Mental
  Health starts with a personal-experience disclaimer pointing to findahelpline.com
- posts.content_notice: optional short notice shown before the article body

Revision ID: 0008_section_personality
Revises: 0007_series
Create Date: 2026-10-01
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_section_personality"
down_revision: Union[str, None] = "0007_series"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MENTAL_HEALTH_FOOTER = (
    "These posts share my personal experience and what helped me. They are not professional advice "
    "and do not replace a mental health professional.\n\n"
    "Estos posts comparten mi experiencia personal y lo que me ayudó. No son consejo profesional "
    "ni reemplazan a un profesional de salud mental.\n\n"
    "If you are struggling, you are not alone: find free, confidential support in your country at "
    "[findahelpline.com](https://findahelpline.com)."
)


def upgrade() -> None:
    op.add_column("sections", sa.Column("theme", sa.String(length=20), server_default="default", nullable=False))
    op.add_column("sections", sa.Column("footer_markdown", sa.Text(), server_default="", nullable=False))
    op.add_column("posts", sa.Column("content_notice", sa.String(length=300), nullable=True))
    sections = sa.table("sections", sa.column("slug", sa.String), sa.column("theme", sa.String), sa.column("footer_markdown", sa.Text))
    op.execute(
        sections.update()
        .where(sections.c.slug == "mental-health")
        .values(theme="calm", footer_markdown=MENTAL_HEALTH_FOOTER)
    )


def downgrade() -> None:
    op.drop_column("posts", "content_notice")
    op.drop_column("sections", "footer_markdown")
    op.drop_column("sections", "theme")
