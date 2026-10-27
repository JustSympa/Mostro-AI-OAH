from __future__ import annotations

import time
import uuid
from typing import Any

import structlog
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = structlog.get_logger(__name__)


class MeterlessMiddleware:
    """Attach request IDs and log safe metadata around agent/API requests."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        state = scope.setdefault("state", {})
        headers = dict(scope.get("headers", []))
        request_id = headers.get(b"x-request-id", b"").decode("latin-1") or str(uuid.uuid4())
        state["request_id"] = request_id
        started_at = time.perf_counter()
        status_code = 500

        async def send_with_metadata(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                response_headers = list(message.get("headers", []))
                response_headers.append((b"x-request-id", request_id.encode("latin-1")))
                message["headers"] = response_headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_metadata)
        finally:
            logger.info(
                "http_request",
                request_id=request_id,
                method=scope.get("method"),
                path=scope.get("path"),
                status_code=status_code,
                duration_ms=round((time.perf_counter() - started_at) * 1000, 2),
            )