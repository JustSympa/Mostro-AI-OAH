from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SourceRegistry(Base):
    __tablename__ = "source_registry"
    __table_args__ = (
        UniqueConstraint("url_prefix", name="uq_source_registry_url_prefix"),
        CheckConstraint(
            "source_type IN ('exchange', 'regulator', 'issuer', 'statistics', 'news', 'research', 'other')",
            name="source_type",
        ),
        CheckConstraint(
            "evidence_role IN ('primary', 'independent', 'analysis', 'context')",
            name="evidence_role",
        ),
        CheckConstraint(
            "access_mode IN ('manual', 'rss', 'api', 'licensed_api', 'crawl')",
            name="access_mode",
        ),
        Index("idx_source_registry_domain", "domain"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(253), nullable=False)
    url_prefix: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    evidence_role: Mapped[str] = mapped_column(String(32), nullable=False)
    sector_tags: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    claim_type_tags: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    access_mode: Mapped[str] = mapped_column(
        String(32), nullable=False, default="manual", server_default="manual"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    def matches(self, *, sector: str, claim_type: str) -> bool:
        if not self.is_active:
            return False
        normalized_sector = sector.strip().casefold()
        normalized_claim = claim_type.strip().casefold()
        sectors = {tag.casefold() for tag in self.sector_tags}
        claim_types = {tag.casefold() for tag in self.claim_type_tags}
        return ("*" in sectors or normalized_sector in sectors) and (
            "*" in claim_types or normalized_claim in claim_types
        )