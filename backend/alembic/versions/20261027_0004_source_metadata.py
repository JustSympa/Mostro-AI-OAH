"""add issuer sector and document provenance metadata

Revision ID: 20261027_0004
Revises: 20261026_0003
Create Date: 2026-10-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261027_0004"
down_revision: Union[str, None] = "20261026_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ipos", sa.Column("sector", sa.String(length=100), nullable=True))
    op.add_column("ipos", sa.Column("industry", sa.String(length=100), nullable=True))
    op.add_column("documents", sa.Column("source_url", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("publisher", sa.String(length=255), nullable=True))
    op.add_column(
        "documents",
        sa.Column("source_type", sa.String(length=50), server_default="unknown", nullable=False),
    )
    op.add_column(
        "documents", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "documents", sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("documents", "retrieved_at")
    op.drop_column("documents", "published_at")
    op.drop_column("documents", "source_type")
    op.drop_column("documents", "publisher")
    op.drop_column("documents", "source_url")
    op.drop_column("ipos", "industry")
    op.drop_column("ipos", "sector")