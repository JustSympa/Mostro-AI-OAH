from __future__ import annotations

import asyncio
import logging
import math
from array import array
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Literal, Protocol

import httpx

from app.agent.errors import RetrievalError
from app.config import Settings

logger = logging.getLogger("mostro")

_FLEXIBLE_DIMENSION_MODELS = {
    "voyage-4-large", "voyage-4", "voyage-4-lite", "voyage-4-nano",
    "voyage-3-large", "voyage-3.5", "voyage-3.5-lite", "voyage-code-3",
}


class Embedder(Protocol):
    async def embed(self, text: str) -> list[float]: ...

    async def embed_documents(self, texts: list[str]) -> list[list[float]]: ...


class VoyageEmbedder:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def embed(self, text: str) -> list[float]:
        return (await self._embed([text], input_type="query"))[0]

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return await self._embed(texts, input_type="document")

    async def _embed(
        self, texts: list[str], *, input_type: Literal["query", "document"]
    ) -> list[list[float]]:
        if not texts:
            return []
        if any(not isinstance(text, str) or not text.strip() for text in texts):
            raise RetrievalError("Embedding inputs must be non-empty text.")
        endpoint = self._settings.embedding_api_url or "https://api.voyageai.com/v1/embeddings"
        api_key = self._settings.embedding_api_key
        if not api_key:
            raise RetrievalError("Embedding service is not configured.")

        endpoint = endpoint.rstrip("/")
        if not endpoint.endswith("/embeddings"):
            endpoint += "/embeddings" if endpoint.endswith("/v1") else "/v1/embeddings"
        embeddings: list[list[float]] = []
        async with httpx.AsyncClient(timeout=self._settings.model_timeout_seconds) as client:
            for start in range(0, len(texts), self._settings.embedding_batch_size):
                batch = texts[start : start + self._settings.embedding_batch_size]
                payload: dict[str, object] = {
                    "input": batch,
                    "model": self._settings.embedding_model,
                    "input_type": input_type,
                    "truncation": False,
                    "output_dtype": "float",
                }
                # Fixed-dimension models (e.g. voyage-finance-2) omit this option.
                if self._settings.embedding_model in _FLEXIBLE_DIMENSION_MODELS:
                    payload["output_dimension"] = self._settings.embedding_dimension
                response = await self._request(client, endpoint, api_key, payload)
                try:
                    embeddings.extend(self._parse(response.json(), len(batch)))
                except (ValueError, TypeError, OverflowError) as exc:
                    raise RetrievalError("Embedding service returned an invalid response.") from exc
        return embeddings

    async def _request(
        self, client: httpx.AsyncClient, endpoint: str, api_key: str, payload: dict[str, object]
    ) -> httpx.Response:
        for attempt in range(self._settings.embedding_max_attempts):
            response: httpx.Response | None = None
            try:
                response = await client.post(
                    endpoint, headers={"Authorization": f"Bearer {api_key}"}, json=payload
                )
                response.raise_for_status()
                return response
            except httpx.HTTPError as exc:
                status = response.status_code if response is not None else None
                retryable = isinstance(exc, httpx.TransportError) or (
                    status is not None and (status == 429 or 500 <= status < 600)
                )
                if not retryable or attempt + 1 == self._settings.embedding_max_attempts:
                    detail = f" (HTTP {status})" if status is not None else ""
                    raise RetrievalError(f"Embedding service request failed{detail}.") from exc
                delay = self._retry_delay(response, attempt)
                if delay > 60:
                    raise RetrievalError(
                        "Embedding service rate limited; retry later (Retry-After exceeds 60 seconds)."
                    ) from exc
                logger.warning(
                    "Voyage request failed (status=%s); retrying attempt %s in %.1fs",
                    status, attempt + 2, delay,
                )
                await asyncio.sleep(delay)
        raise AssertionError("Embedding attempts must be positive.")

    @staticmethod
    def _retry_delay(response: httpx.Response | None, attempt: int) -> float:
        delay = float(2**attempt)
        header = response.headers.get("Retry-After") if response is not None else None
        if header is not None:
            try:
                seconds = float(header)
            except ValueError:
                try:
                    date = parsedate_to_datetime(header)
                    seconds = (date - datetime.now(timezone.utc)).total_seconds()
                except (TypeError, ValueError, OverflowError):
                    logger.warning("Voyage returned an invalid Retry-After header.")
                    return delay
            if math.isfinite(seconds):
                delay = max(delay, seconds)
        return delay

    def _parse(self, body: object, count: int) -> list[list[float]]:
        if not isinstance(body, dict) or body.get("model") != self._settings.embedding_model:
            raise ValueError("Unexpected embedding model.")
        data = body.get("data")
        if not isinstance(data, list) or len(data) != count:
            raise ValueError("Embedding count does not match inputs.")
        indexed: dict[int, list[float]] = {}
        for item in data:
            if not isinstance(item, dict):
                raise ValueError("Invalid embedding object.")
            index, vector = item.get("index"), item.get("embedding")
            if type(index) is not int or not 0 <= index < count or index in indexed:
                raise ValueError("Invalid embedding index.")
            if not isinstance(vector, list) or len(vector) != self._settings.embedding_dimension:
                raise ValueError("Embedding dimension does not match the chunks table.")
            if any(type(value) not in (int, float) for value in vector):
                raise ValueError("Embedding values must be numeric.")
            values = [float(value) for value in vector]
            # pgvector stores float32, so validate after its precision conversion.
            stored_values = array("f", values)
            if not all(math.isfinite(value) for value in stored_values) or not any(stored_values):
                raise ValueError("Embedding must be finite and non-zero for cosine search.")
            indexed[index] = values
        return [indexed[index] for index in range(count)]