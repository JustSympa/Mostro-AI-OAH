"""risk profiles

Revision ID: 20261024_0002
Revises: 20241023_0001
Create Date: 2026-10-24
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261024_0002"
down_revision: Union[str, None] = "20241023_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "risk_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("questionnaire_version", sa.String(length=32), nullable=False),
        sa.Column("risk_level", sa.Integer(), nullable=False),
        sa.Column("risk_label", sa.Text(), nullable=False),
        sa.Column("raw_score", sa.Float(), nullable=False),
        sa.Column("weighted_score", sa.Float(), nullable=False),
        sa.Column("answers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "applied_constraints",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_risk_profiles_user_id_users", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_risk_profiles"),
        sa.UniqueConstraint("user_id", "version", name="uq_risk_profiles_user_version"),
        sa.CheckConstraint("risk_level BETWEEN 1 AND 5", name=op.f("ck_risk_profiles_risk_level_range")),
    )
    op.create_index("ix_risk_profiles_user_id", "risk_profiles", ["user_id"])

    op.create_table(
        "risk_profile_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("risk_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", sa.String(length=64), nullable=False),
        sa.Column("option_id", sa.String(length=64), nullable=False),
        sa.Column("option_label", sa.Text(), nullable=False),
        sa.Column("option_score", sa.Float(), nullable=True),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.Column("contribution", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(
            ["risk_profile_id"],
            ["risk_profiles.id"],
            name="fk_risk_profile_answers_risk_profile_id_risk_profiles",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_risk_profile_answers"),
        sa.UniqueConstraint(
            "risk_profile_id", "question_id", name="uq_risk_profile_answers_profile_question"
        ),
    )
    op.create_index("ix_risk_profile_answers_risk_profile_id", "risk_profile_answers", ["risk_profile_id"])


def downgrade() -> None:
    op.drop_table("risk_profile_answers")
    op.drop_table("risk_profiles")
