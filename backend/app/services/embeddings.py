from __future__ import annotations

from typing import Protocol

import httpx

from app.agent.errors import RetrievalError
from app.config import Settings


class Embedder(Protocol):
    async def embed(self, text: str) -> list[float]: ...


class VoyageEmbedder:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def embed(self, text: str) -> list[float]:
        endpoint = self._settings.embedding_api_url
        api_key = self._settings.embedding_api_key
        if not endpoint or not api_key:
            raise RetrievalError("Embedding service is not configured.")

        try:
            async with httpx.AsyncClient(timeout=self._settings.model_timeout_seconds) as client:
                response = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "input": [text],
                        "model": self._settings.embedding_model,
                        "input_type": "query",
                        "output_dimension": self._settings.embedding_dimension,
                    },
                )
                response.raise_for_status()
                embedding = response.json()["data"][0]["embedding"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise RetrievalError("Embedding service request failed.") from exc

        if len(embedding) != self._settings.embedding_dimension:
            raise RetrievalError("Embedding dimension does not match the chunks table.")
        return [float(value) for value in embedding]