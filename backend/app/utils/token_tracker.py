from __future__ import annotations

from dataclasses import dataclass

import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)


@dataclass
class Usage:
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    model: str | None = None


class TokenTracker:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def report(self, usage: Usage, *, session_id: str, request_id: str) -> None:
        cost = None
        if (
            usage.prompt_tokens is not None and usage.completion_tokens is not None
            and self._settings.input_cost_per_million_tokens is not None
            and self._settings.output_cost_per_million_tokens is not None
        ):
            cost = (
                usage.prompt_tokens * self._settings.input_cost_per_million_tokens
                + usage.completion_tokens * self._settings.output_cost_per_million_tokens
            ) / 1_000_000
        payload = {
            "provider": "meterless",
            "route": self._settings.meterless_model,
            "reported_model": usage.model,
            "session_id": session_id,
            "request_id": request_id,
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "usage_reported": usage.prompt_tokens is not None and usage.completion_tokens is not None,
            "estimated_cost": cost,
        }
        logger.info("agent_usage", **payload)