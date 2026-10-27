from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, Integer, JSON, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

MemoryJSON = JSON().with_variant(JSONB(), "postgresql")


class HMemState(Base):
    __tablename__ = "hmem_states"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    state: Mapped[dict[str, Any]] = mapped_column(MemoryJSON, nullable=False, default=dict)


class HMemLedger(Base):
    __tablename__ = "hmem_ledger"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    memory_id: Mapped[str] = mapped_column(String(100), nullable=False)
    entry: Mapped[dict[str, Any]] = mapped_column(MemoryJSON, nullable=False)
