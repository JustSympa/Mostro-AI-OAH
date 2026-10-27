from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.memory.engine import HMem
from app.memory.types import Event, Feedback, Resolution, Shape, SleepPlan
from app.models import ChatSession, User
from app.services.memory import MemoryRepository

router = APIRouter(prefix="/memory", tags=["h-mem"])


class CaptureIn(Shape):
    event: Event
    text: str = Field(min_length=1, max_length=8000)
    chat_id: uuid.UUID
    document_name: str | None = Field(default=None, min_length=1, max_length=255)


class FeedbackIn(Shape):
    kind: Feedback


class ReviewIn(Shape):
    approve: bool


class ResolveIn(Shape):
    strategy: Resolution
    content: str | None = Field(default=None, min_length=1, max_length=4000)


class MaintenanceIn(Shape):
    operation: Literal["execute", "restore"]
    plan: SleepPlan | None = None
    backup_id: str | None = None


async def memory_engine(
    session: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> AsyncIterator[HMem]:
    if not get_settings().hmem_enabled:
        raise HTTPException(503, "H-MEM is disabled.")
    repository = MemoryRepository(session, user.id)
    engine = await repository.load()
    try:
        yield engine
    except KeyError as exc:
        raise HTTPException(404, "Memory, proposal, conflict or backup not found.") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    else:
        await repository.save(engine)


Engine = Annotated[HMem, Depends(memory_engine)]


@router.get("")
async def inspect_memory(engine: Engine) -> dict[str, Any]:
    return {
        "health": engine.health(),
        "memories": [item.model_dump(mode="json", by_alias=True, exclude={"embedding"}) for item in engine.state.records],
        "proposals": [item.model_dump(mode="json", by_alias=True) for item in engine.state.proposals],
        "conflicts": [item.model_dump(mode="json", by_alias=True) for item in engine.state.conflicts],
        "reports": engine.state.reports,
    }


@router.post("/events")
async def capture(
    payload: CaptureIn, engine: Engine,
    session: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
) -> dict[str, Any]:
    chat = (
        await session.execute(
            select(ChatSession).where(ChatSession.id == payload.chat_id, ChatSession.user_id == user.id)
        )
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(404, "Chat session not found.")
    if payload.document_name and payload.event not in ("file_open", "file_save", "file_edit"):
        raise HTTPException(422, "Document capture requires a file event.")
    records = await engine.mine(
        payload.event, payload.text, chat_id=str(chat.id), mission_id=str(chat.ipo_id),
        document_name=payload.document_name,
    )
    engine.scan_conflicts()
    return {"ids": [item.id for item in records]}


@router.post("/{memory_id}/feedback")
async def feedback(memory_id: str, payload: FeedbackIn, engine: Engine) -> dict[str, str]:
    engine.feedback(memory_id, payload.kind)
    return {"status": "recorded"}


@router.delete("/{memory_id}")
async def delete(memory_id: str, engine: Engine) -> dict[str, str]:
    engine.delete(memory_id, "user request")
    return {"status": "deleted"}


@router.post("/dream")
async def dream(engine: Engine) -> dict[str, Any]:
    return {"proposals": [item.model_dump(mode="json", by_alias=True) for item in engine.dream()]}


@router.post("/proposals/{proposal_id}/review")
async def review(proposal_id: str, payload: ReviewIn, engine: Engine) -> dict[str, Any]:
    memory = engine.review_proposal(proposal_id, payload.approve)
    return {"memoryId": memory.id if memory else None}


@router.post("/conflicts/scan")
async def scan(engine: Engine) -> dict[str, Any]:
    return {"conflicts": [item.model_dump(mode="json", by_alias=True) for item in engine.scan_conflicts()]}


@router.post("/conflicts/{conflict_id}/resolve")
async def resolve(conflict_id: str, payload: ResolveIn, engine: Engine) -> dict[str, str]:
    engine.resolve(conflict_id, payload.strategy, content=payload.content)
    return {"status": "resolved"}


@router.post("/conflicts/{conflict_id}/auto-resolve")
async def auto_resolve(conflict_id: str, engine: Engine) -> dict[str, str]:
    return {"status": engine.auto_resolve(conflict_id)}


@router.get("/sleep/preview")
async def sleep_preview(engine: Engine) -> SleepPlan:
    return engine.sleep_preview()


@router.post("/sleep")
async def sleep(payload: MaintenanceIn, engine: Engine) -> dict[str, Any]:
    if payload.operation == "restore":
        if not payload.backup_id:
            raise HTTPException(422, "Restore requires backupId.")
        engine.restore(payload.backup_id)
        return {"status": "restored"}
    if payload.plan is None:
        raise HTTPException(422, "Execute requires a reviewed sleep plan.")
    return engine.sleep_execute(payload.plan)


@router.get("/ledger")
async def ledger(
    session: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
    memory_id: str | None = None, after_id: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    entries = await MemoryRepository(session, user.id).ledger(
        memory_id=memory_id, after_id=after_id, limit=limit
    )
    return {"entries": entries, "nextAfterId": entries[-1]["id"] if entries else after_id}
