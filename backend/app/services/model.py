from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated, Literal, Protocol

import httpx
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, ValidationError

from app.agent.errors import ModelError
from app.config import Settings

logger = logging.getLogger("mostro.nightshift")


@dataclass(frozen=True)
class ModelChunk:
    content: str = ""
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    model: str | None = None


class CompletionClient(Protocol):
    def stream(self, prompt: str) -> AsyncIterator[ModelChunk]: ...


class _Usage(BaseModel):
    prompt_tokens: Annotated[StrictInt, Field(ge=0)]
    completion_tokens: Annotated[StrictInt, Field(ge=0)]


class _Delta(BaseModel):
    content: StrictStr | None = None
    refusal: StrictStr | None = None
    tool_calls: list[object] | None = None
    function_call: dict[str, object] | None = None


class _Choice(BaseModel):
    index: Annotated[StrictInt, Field(ge=0, le=0)]
    delta: _Delta
    finish_reason: Literal["stop", "length", "tool_calls", "function_call", "content_filter"] | None = None


class _Event(BaseModel):
    model_config = ConfigDict(hide_input_in_errors=True)

    choices: list[_Choice] = Field(max_length=1)
    usage: _Usage | None = None
    model: StrictStr | None = None


async def _sse_events(response: httpx.Response) -> AsyncIterator[tuple[str, str]]:
    data: list[str] = []
    event_type = "message"
    size = 0
    async for line in response.aiter_lines():
        if not line:
            if data:
                yield event_type, "\n".join(data)
            data, event_type, size = [], "message", 0
        elif line.startswith("data:"):
            part = line[5:].removeprefix(" ")
            size += len(part)
            if size > 1_048_576:
                raise ModelError("Nightshift returned an oversized streaming event.")
            data.append(part)
        elif line.startswith("event:"):
            event_type = line[6:].strip()
    # SSE events require a terminating blank line. Do not accept a partial frame
    # at EOF as evidence that the upstream request completed.
    if data:
        raise ModelError("Nightshift stream ended in an incomplete event.")


class NightshiftClient:
    """Meterless Runtime chat proxy; model selection stays in the Nightshift fleet."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _headers(self, *, chat: bool = False) -> dict[str, str]:
        token = (self._settings.meterless_api_key or "").strip()
        if not token or token.lower() == "rt-local":
            raise ModelError(
                "Nightshift requires the real runtime token in METERLESS_API_KEY, not rt-local."
            )
        headers = {
            "Authorization": f"Bearer {token}",
            "meterless-app": self._settings.meterless_app_id,
        }
        if chat:
            headers.update({"meterless-scope": "user", "Accept": "text/event-stream"})
        return headers

    @staticmethod
    def _http_error(exc: httpx.HTTPError) -> ModelError:
        if isinstance(exc, httpx.HTTPStatusError):
            status = exc.response.status_code
            if status in {401, 403}:
                return ModelError("Nightshift is unauthorized; check the runtime token.")
            return ModelError(f"Nightshift request failed (HTTP {status}).")
        return ModelError("Nightshift is unreachable or the model request timed out.")

    async def _models(self, client: httpx.AsyncClient) -> list[str]:
        response = await client.get(
            f"{self._settings.meterless_proxy_url}/models", headers=self._headers()
        )
        response.raise_for_status()
        body = response.json()
        if not isinstance(body, dict) or not isinstance(body.get("data"), list):
            raise ModelError("Nightshift returned an invalid model discovery response.")
        models: list[str] = []
        for item in body["data"]:
            if not isinstance(item, dict) or not isinstance(item.get("id"), str):
                raise ModelError("Nightshift returned an invalid model discovery response.")
            if item["id"].startswith("meterless/") and item["id"] not in models:
                models.append(item["id"])
        if not models:
            raise ModelError("The configured endpoint does not advertise Nightshift meterless/* routes.")
        return models

    async def models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=self._settings.meterless_timeout_seconds) as client:
                return await self._models(client)
        except httpx.HTTPError as exc:
            raise self._http_error(exc) from exc
        except ValueError as exc:
            raise ModelError("Nightshift returned malformed model discovery JSON.") from exc

    async def stream(self, prompt: str) -> AsyncIterator[ModelChunk]:
        if not isinstance(prompt, str) or not prompt.strip():
            raise ModelError("Nightshift requires a non-empty text prompt.")
        headers = self._headers(chat=True)
        payload = {
            "model": self._settings.meterless_model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True,
            "stream_options": {"include_usage": True},
            "max_tokens": self._settings.meterless_max_tokens,
        }
        stopped = False
        has_answer = False
        try:
            async with httpx.AsyncClient(timeout=self._settings.meterless_timeout_seconds) as client:
                models = await self._models(client)
                if self._settings.meterless_model not in models:
                    raise ModelError("The configured METERLESS_MODEL route is not advertised by Nightshift.")
                logger.info("Nightshift generation started: route=%s", self._settings.meterless_model)
                async with client.stream(
                    "POST", self._settings.model_url, headers=headers, json=payload
                ) as response:
                    response.raise_for_status()
                    if response.headers.get("content-type", "").split(";")[0].strip().lower() != "text/event-stream":
                        raise ModelError("Nightshift did not return a text/event-stream chat response.")
                    async for event_type, data in _sse_events(response):
                        if event_type == "error":
                            raise ModelError("Nightshift reported a streaming error.")
                        if data == "[DONE]":
                            if not stopped or not has_answer:
                                raise ModelError("Nightshift ended without a complete text answer.")
                            logger.info("Nightshift generation completed: route=%s", self._settings.meterless_model)
                            return
                        raw = json.loads(data)
                        if isinstance(raw, dict) and raw.get("error") is not None:
                            raise ModelError("Nightshift reported a streaming error.")
                        event = _Event.model_validate(raw)
                        content = ""
                        reason = None
                        if event.choices:
                            choice = event.choices[0]
                            delta, reason = choice.delta, choice.finish_reason
                            if delta.refusal or delta.tool_calls or delta.function_call:
                                raise ModelError("Nightshift returned a refusal or unsupported tool call.")
                            content = delta.content or ""
                            if stopped and (content or reason is not None):
                                raise ModelError("Nightshift returned content after the answer finished.")
                        elif event.usage is None:
                            raise ModelError("Nightshift returned a chat event without choices or usage.")
                        # Ignore reasoning_content and other metadata. Only delta.content
                        # is user-visible; token counts are cumulative, not per delta.
                        if content or event.usage is not None or event.model is not None:
                            yield ModelChunk(
                                content=content if reason in {None, "stop"} else "",
                                prompt_tokens=event.usage.prompt_tokens if event.usage else None,
                                completion_tokens=event.usage.completion_tokens if event.usage else None,
                                model=event.model,
                            )
                        has_answer = has_answer or bool(content.strip())
                        if reason is not None:
                            if reason != "stop":
                                raise ModelError(
                                    f"Nightshift could not complete the answer (finish_reason={reason})."
                                )
                            stopped = True
            raise ModelError("Nightshift stream ended before the completion marker.")
        except httpx.HTTPError as exc:
            # Never replay a generation: tokens or provider charges may already exist.
            raise self._http_error(exc) from exc
        except (ValueError, ValidationError, TypeError) as exc:
            raise ModelError("Nightshift returned malformed streaming data.") from exc
