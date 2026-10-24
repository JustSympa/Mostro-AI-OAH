from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, text
from sqlalchemy.dialects.postgresql import CITEXT, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.audit import AuditLog
    from app.models.backup_code import BackupCode
    from app.models.email_token import EmailVerificationToken
    from app.models.oauth import OAuthIdentity
    from app.models.refresh_token import RefreshToken
    from app.models.two_factor import TwoFactorSecret
    from app.models.webauthn import WebAuthnCredential


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="active", server_default="active"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    oauth_identities: Mapped[list[OAuthIdentity]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    two_factor: Mapped[TwoFactorSecret | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    backup_codes: Mapped[list[BackupCode]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    email_tokens: Mapped[list[EmailVerificationToken]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(back_populates="user")
    webauthn_credentials: Mapped[list[WebAuthnCredential]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def two_factor_enabled(self) -> bool:
        return bool(self.two_factor and self.two_factor.enabled_at is not None)
