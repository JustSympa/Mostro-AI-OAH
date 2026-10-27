"""add user-scoped H-MEM state and append-only application ledger

Revision ID: 20261027_0006
Revises: 20261027_0005
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261027_0006"
down_revision = "20261027_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hmem_states",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("state", postgresql.JSONB(), nullable=False),
    )
    op.create_table(
        "hmem_ledger",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("memory_id", sa.String(100), nullable=False),
        sa.Column("entry", postgresql.JSONB(), nullable=False),
    )
    op.create_index("ix_hmem_ledger_user_id", "hmem_ledger", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_hmem_ledger_user_id", table_name="hmem_ledger")
    op.drop_table("hmem_ledger")
    op.drop_table("hmem_states")
