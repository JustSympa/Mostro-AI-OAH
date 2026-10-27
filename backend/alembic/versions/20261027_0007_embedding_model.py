"""Track the model used to embed each prospectus chunk.

Revision ID: 20261027_0007
Revises: 20261027_0006
"""

from alembic import op
import sqlalchemy as sa

revision = "20261027_0007"
down_revision = "20261027_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing vectors have unknown provenance; re-embed rather than guessing.
    op.add_column("chunks", sa.Column("embedding_model", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("chunks", "embedding_model")
