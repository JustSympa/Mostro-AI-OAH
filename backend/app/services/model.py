from __future__ import annotations

import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.agent.errors import ModelError
from app.config import Settings


@dataclass(frozen=True)
class ModelChunk:
    content: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0


class CompletionClient(Protocol):
    def stream(self, prompt: str) -> AsyncIterator[ModelChunk]: ...


class NemetronBoltClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def stream(self, prompt: str) -> AsyncIterator[ModelChunk]:
        headers: dict[str, str] = {"Accept": "text/event-stream"}
        if self._settings.meterless_api_key:
            headers["Authorization"] = f"Bearer {self._settings.meterless_api_key}"
        payload = {
            "model": self._settings.nemetron_bolt_model,
            "prompt": prompt,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        try:
            timeout = httpx.Timeout(self._settings.model_timeout_seconds)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST", self._settings.model_url, headers=headers, json=payload
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if not data or data == "[DONE]":
                            continue
                        try:
                            event: dict[str, Any] = json.loads(data)
                        except json.JSONDecodeError as exc:
                            raise ModelError("Model returned malformed streaming data.") from exc
                        usage = event.get("usage") or {}
                        choices = event.get("choices") or []
                        content = ""
                        if choices:
                            choice = choices[0]
                            content = choice.get("text", "") or choice.get("delta", {}).get(
                                "content", ""
                            )
                        if content or usage:
                            yield ModelChunk(
                                content=str(content),
                                prompt_tokens=int(usage.get("prompt_tokens", 0)),
                                completion_tokens=int(usage.get("completion_tokens", 0)),
                            )
        except (httpx.HTTPError, TypeError, ValueError) as exc:
            raise ModelError("Model service request failed.") from exc