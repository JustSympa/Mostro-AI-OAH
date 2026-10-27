"""add reviewed source registry

Revision ID: 20261027_0005
Revises: 20261027_0004
Create Date: 2026-10-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261027_0005"
down_revision: Union[str, None] = "20261027_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "source_registry",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("domain", sa.String(length=253), nullable=False),
        sa.Column("url_prefix", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("evidence_role", sa.String(length=32), nullable=False),
        sa.Column(
            "sector_tags",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "claim_type_tags",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("access_mode", sa.String(length=32), server_default="manual", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("priority", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "source_type IN ('exchange', 'regulator', 'issuer', 'statistics', 'news', 'research', 'other')",
            name=op.f("ck_source_registry_source_type"),
        ),
        sa.CheckConstraint(
            "evidence_role IN ('primary', 'independent', 'analysis', 'context')",
            name=op.f("ck_source_registry_evidence_role"),
        ),
        sa.CheckConstraint(
            "access_mode IN ('manual', 'rss', 'api', 'licensed_api', 'crawl')",
            name=op.f("ck_source_registry_access_mode"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_source_registry"),
        sa.UniqueConstraint("url_prefix", name="uq_source_registry_url_prefix"),
    )
    op.create_index("idx_source_registry_domain", "source_registry", ["domain"])

    op.add_column(
        "documents", sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        "fk_documents_source_id_source_registry",
        "documents",
        "source_registry",
        ["source_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_documents_source_id_source_registry", "documents", type_="foreignkey")
    op.drop_column("documents", "source_id")
    op.drop_index("idx_source_registry_domain", table_name="source_registry")
    op.drop_table("source_registry")