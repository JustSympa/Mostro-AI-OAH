from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from sse_starlette import EventSourceResponse, JSONServerSentEvent
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import ModelError, RefusalError
from app.config import get_settings
from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models import User
from app.schemas.agent_request import AgentRequest
from app.schemas.agent_response import AgentEvent
from app.services.agent import AgentService
from app.services.embeddings import VoyageEmbedder
from app.services.model import NemetronBoltClient
from app.utils.token_tracker import TokenTracker

logger = logging.getLogger("mostro.agent")
router = APIRouter(tags=["agent"])


def get_agent_service(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentService:
    settings = get_settings()
    return AgentService(
        session=session,
        user=user,
        settings=settings,
        embedder=VoyageEmbedder(settings),
        model=NemetronBoltClient(settings),
        tracker=TokenTracker(settings),
    )


@router.post("/sse")
async def stream_agent(
    payload: AgentRequest,
    request: Request,
    service: AgentService = Depends(get_agent_service),
) -> EventSourceResponse:
    request_id = str(getattr(request.state, "request_id", "unknown"))

    async def events() -> AsyncIterator[JSONServerSentEvent]:
        try:
            async for event in service.stream(payload, request_id):
                if await request.is_disconnected():
                    return
                yield JSONServerSentEvent(data=event.model_dump(mode="json"))
        except RefusalError as exc:
            yield JSONServerSentEvent(
                data=AgentEvent(type="refusal", content=str(exc)).model_dump(mode="json")
            )
        except ModelError:
            logger.exception("Agent model execution failed", extra={"request_id": request_id})
            yield JSONServerSentEvent(
                data=AgentEvent(
                    type="error", content="The assistant is temporarily unavailable."
                ).model_dump(mode="json")
            )
        except Exception:
            logger.exception("Unexpected agent workflow failure", extra={"request_id": request_id})
            yield JSONServerSentEvent(
                data=AgentEvent(
                    type="error", content="The assistant could not complete this request."
                ).model_dump(mode="json")
            )

    return EventSourceResponse(events(), headers={"Cache-Control": "no-cache"})