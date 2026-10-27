"""knowledge base and conversation schema

Revision ID: 20261026_0003
Revises: 20261024_0002
Create Date: 2026-10-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "20261026_0003"
down_revision: Union[str, None] = "20261024_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')

    op.add_column(
        "users",
        sa.Column(
            "onboarding_answers",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "users",
        sa.Column("preferred_language", sa.String(length=10), server_default="en", nullable=False),
    )
    op.create_check_constraint(
        op.f("ck_users_preferred_language_supported"),
        "users",
        "preferred_language IN ('en', 'fr')",
    )

    op.create_table(
        "glossary_terms",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("term", sa.String(length=150), nullable=False),
        sa.Column("category", sa.String(length=100), server_default="general_investing", nullable=False),
        sa.Column("definition", sa.Text(), nullable=False),
        sa.Column("simple_explanation", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_glossary_terms"),
        sa.UniqueConstraint("term", name="uq_glossary_terms_term"),
    )

    op.create_table(
        "user_knowledge_states",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("glossary_term_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mastery_level", sa.String(length=50), server_default="introduced", nullable=False),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint(
            "mastery_level IN ('introduced', 'reviewing', 'mastered')",
            name=op.f("ck_user_knowledge_states_mastery_level"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_user_knowledge_states_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["glossary_term_id"],
            ["glossary_terms.id"],
            name="fk_user_knowledge_states_glossary_term_id_glossary_terms",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user_knowledge_states"),
        sa.UniqueConstraint("user_id", "glossary_term_id", name="uq_user_glossary"),
    )

    op.create_table(
        "ipos",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("issuer_country", sa.String(length=100), nullable=False),
        sa.Column("authorized_sources", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_ipos"),
    )

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("ipo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("file_hash", sa.String(length=64), nullable=False),
        sa.Column("version", sa.String(length=20), server_default="1.0", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="indexed", nullable=False),
        sa.ForeignKeyConstraint(["ipo_id"], ["ipos.id"], name="fk_documents_ipo_id_ipos", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_documents"),
        sa.UniqueConstraint("file_hash", name="uq_documents_file_hash"),
    )

    op.create_table(
        "chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ipo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1024), nullable=True),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("section_path", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], name="fk_chunks_document_id_documents", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ipo_id"], ["ipos.id"], name="fk_chunks_ipo_id_ipos", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_chunks"),
    )
    op.create_index(
        "idx_chunks_embedding",
        "chunks",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.create_index("idx_chunks_ipo_id", "chunks", ["ipo_id"])

    op.create_table(
        "key_facts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("ipo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("fact_type", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False),
        sa.Column("review_status", sa.String(length=50), server_default="verified", nullable=False),
        sa.Column("source_page", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "review_status IN ('pending', 'verified', 'rejected')",
            name=op.f("ck_key_facts_fact_review_status"),
        ),
        sa.ForeignKeyConstraint(["ipo_id"], ["ipos.id"], name="fk_key_facts_ipo_id_ipos", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_key_facts"),
    )

    op.create_table(
        "section_summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("ipo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_name", sa.String(length=255), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["ipo_id"], ["ipos.id"], name="fk_section_summaries_ipo_id_ipos", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_section_summaries"),
    )

    op.create_table(
        "chat_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ipo_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("turn_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_chat_sessions_user_id_users", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ipo_id"], ["ipos.id"], name="fk_chat_sessions_ipo_id_ipos", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_chat_sessions"),
    )

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("chat_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("intent", sa.String(length=50), nullable=True),
        sa.Column("latency_seconds", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("sender IN ('user', 'assistant')", name=op.f("ck_messages_sender")),
        sa.ForeignKeyConstraint(["chat_session_id"], ["chat_sessions.id"], name="fk_messages_chat_session_id_chat_sessions", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_messages"),
    )

    op.create_table(
        "message_citations",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quote_text", sa.Text(), nullable=True),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], name="fk_message_citations_message_id_messages", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chunk_id"], ["chunks.id"], name="fk_message_citations_chunk_id_chunks", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_message_citations"),
    )

    op.create_table(
        "calendar_proposals",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("chat_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key_fact_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_title", sa.String(length=255), nullable=False),
        sa.Column("event_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="proposed", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint(
            "status IN ('proposed', 'confirmed', 'synced_to_device', 'rejected')",
            name=op.f("ck_calendar_proposals_calendar_status"),
        ),
        sa.ForeignKeyConstraint(["chat_session_id"], ["chat_sessions.id"], name="fk_calendar_proposals_chat_session_id_chat_sessions", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["key_fact_id"], ["key_facts.id"], name="fk_calendar_proposals_key_fact_id_key_facts", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_calendar_proposals"),
    )


def downgrade() -> None:
    op.drop_table("calendar_proposals")
    op.drop_table("message_citations")
    op.drop_table("messages")
    op.drop_table("chat_sessions")
    op.drop_table("section_summaries")
    op.drop_table("key_facts")
    op.drop_index("idx_chunks_ipo_id", table_name="chunks")
    op.drop_index("idx_chunks_embedding", table_name="chunks")
    op.drop_table("chunks")
    op.drop_table("documents")
    op.drop_table("ipos")
    op.drop_table("user_knowledge_states")
    op.drop_table("glossary_terms")
    op.drop_constraint(op.f("ck_users_preferred_language_supported"), "users", type_="check")
    op.drop_column("users", "preferred_language")
    op.drop_column("users", "onboarding_answers")
