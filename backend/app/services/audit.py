from __future__ import annotations

import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


def client_ip(request: Request) -> str | None:
    if request.client is None:
        return None
    return request.client.host


def user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


async def write_audit(
    session: AsyncSession,
    *,
    event: str,
    request: Request,
    user_id: uuid.UUID | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    session.add(
        AuditLog(
            user_id=user_id,
            event=event,
            ip=client_ip(request),
            user_agent=user_agent(request),
            extra_metadata=metadata or {},
        )
    )
