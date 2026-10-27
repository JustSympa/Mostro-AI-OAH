from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx
import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)


@dataclass
class Usage:
    prompt_tokens: int = 0
    completion_tokens: int = 0


class TokenTracker:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def report(self, usage: Usage, *, session_id: str, request_id: str) -> None:
        cost = (
            usage.prompt_tokens * self._settings.input_cost_per_million_tokens
            + usage.completion_tokens * self._settings.output_cost_per_million_tokens
        ) / 1_000_000
        payload = {
            "session_id": session_id,
            "request_id": request_id,
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "cost": cost,
        }
        logger.info("agent_usage", **payload)
        endpoint = self._settings.meterless_usage_url
        if endpoint is None:
            return
        headers = {}
        if self._settings.meterless_api_key:
            headers["Authorization"] = f"Bearer {self._settings.meterless_api_key}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
        except httpx.HTTPError:
            logging.getLogger("mostro.agent").exception("Meterless usage report failed")