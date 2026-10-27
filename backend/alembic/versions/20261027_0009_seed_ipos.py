"""Seed the ipos table with the demo issuers used by the dashboard.

The agent refuses any request whose ipo_id does not resolve through the
`agent_ipos` view, so the table cannot be empty for the assistant to work.

Revision ID: 20261027_0009
Revises: 20261027_0008
"""

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261027_0009"
down_revision = "20261027_0008"
branch_labels = None
depends_on = None


# Stable ids so seeded rows stay referenceable across rebuilds.
IPOS = [
    ("8f2c1a54-6b21-4e0d-9c7a-1d2e3f4a5b60", "Stripe, Inc.", "STRP", "United States"),
    ("1a7d3e92-5c48-4b16-8f2e-2a3b4c5d6e71", "Databricks Inc.", "DBRK", "United States"),
    ("4b9e2f17-8d35-4a70-b1c6-3e4f5a6b7c82", "Cerebras Systems", "CBRS", "United States"),
    ("6c0a5d83-9e47-4f21-a3b8-4c5d6e7f8a93", "Klarna Group", "KLAR", "Sweden"),
    ("2d8b6e04-1f59-4c32-b5a7-5e6f7a8b9c04", "Reddit, Inc.", "RDDT", "United States"),
    ("9e4c7a26-3b61-4d84-9c0e-6a7b8c9d0e15", "Discord Technologies", "DSCD", "United States"),
]


def upgrade() -> None:
    ipos = sa.table(
        "ipos",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("company_name", sa.String),
        sa.column("symbol", sa.String),
        sa.column("issuer_country", sa.String),
    )
    op.bulk_insert(
        ipos,
        [
            {
                "id": uuid.UUID(row[0]),
                "company_name": row[1],
                "symbol": row[2],
                "issuer_country": row[3],
            }
            for row in IPOS
        ],
    )


def downgrade() -> None:
    ids = ", ".join(f"'{row[0]}'" for row in IPOS)
    op.execute(f"DELETE FROM ipos WHERE id IN ({ids})")
