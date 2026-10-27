from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    term: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    category: Mapped[str] = mapped_column(
        String(100), nullable=False, default="general_investing", server_default="general_investing"
    )
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    simple_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class UserKnowledgeState(Base):
    __tablename__ = "user_knowledge_states"
    __table_args__ = (
        CheckConstraint(
            "mastery_level IN ('introduced', 'reviewing', 'mastered')", name="mastery_level"
        ),
        UniqueConstraint("user_id", "glossary_term_id", name="uq_user_glossary"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    glossary_term_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("glossary_terms.id", ondelete="CASCADE"), nullable=False
    )
    mastery_level: Mapped[str] = mapped_column(
        String(50), nullable=False, default="introduced", server_default="introduced"
    )
    last_reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
