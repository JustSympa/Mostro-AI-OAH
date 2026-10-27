from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.memory.engine import HMem
from app.memory.types import MemoryState
from app.models.memory import HMemLedger, HMemState


class MemoryRepository:
    """Lock the user's state and commit memory plus its audit entries atomically."""

    def __init__(self, session: AsyncSession, user_id: uuid.UUID) -> None:
        self.session = session
        self.user_id = user_id
        self.row: HMemState | None = None

    async def load(self) -> HMem:
        await self.session.execute(
            insert(HMemState).values(
                user_id=self.user_id, state=MemoryState().model_dump(mode="json", by_alias=True)
            ).on_conflict_do_nothing(index_elements=["user_id"])
        )
        self.row = (
            await self.session.execute(
                select(HMemState).where(HMemState.user_id == self.user_id).with_for_update()
            )
        ).scalar_one()
        return HMem(MemoryState.model_validate(self.row.state), actor=f"user:{self.user_id}")

    async def save(self, engine: HMem) -> None:
        if self.row is None:
            raise RuntimeError("Load memory before saving it.")
        self.row.state = engine.state.model_dump(mode="json", by_alias=True)
        for entry in engine.ledger:
            self.session.add(HMemLedger(
                user_id=self.user_id, memory_id=entry.memory_id,
                entry=entry.model_dump(mode="json", by_alias=True),
            ))
        await self.session.flush()
        engine.ledger.clear()

    async def ledger(
        self, *, memory_id: str | None = None, after_id: int = 0, limit: int = 100
    ) -> list[dict[str, Any]]:
        query = select(HMemLedger).where(
            HMemLedger.user_id == self.user_id, HMemLedger.id > after_id
        )
        if memory_id is not None:
            query = query.where(HMemLedger.memory_id == memory_id)
        entries = (
            await self.session.execute(query.order_by(HMemLedger.id).limit(limit))
        ).scalars().all()
        return [{"id": item.id, **item.entry} for item in entries]
