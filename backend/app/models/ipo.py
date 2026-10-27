from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IPO(Base):
    __tablename__ = "ipos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    issuer_country: Mapped[str] = mapped_column(String(100), nullable=False)
    authorized_sources: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="active", server_default="active"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    ipo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ipos.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0", server_default="1.0")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="indexed", server_default="indexed")


class Chunk(Base):
    __tablename__ = "chunks"
    __table_args__ = (
        Index(
            "idx_chunks_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("idx_chunks_ipo_id", "ipo_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    ipo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ipos.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024), nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    section_path: Mapped[str | None] = mapped_column(String(255), nullable=True)


class KeyFact(Base):
    __tablename__ = "key_facts"
    __table_args__ = (
        CheckConstraint(
            "review_status IN ('pending', 'verified', 'rejected')", name="fact_review_status"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    ipo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ipos.id", ondelete="CASCADE"), nullable=False
    )
    fact_type: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    review_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="verified", server_default="verified"
    )
    source_page: Mapped[int] = mapped_column(Integer, nullable=False)


class SectionSummary(Base):
    __tablename__ = "section_summaries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    ipo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ipos.id", ondelete="CASCADE"), nullable=False
    )
    section_name: Mapped[str] = mapped_column(String(255), nullable=False)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
