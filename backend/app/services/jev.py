from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import Settings


class JEVClassifierImpl:
    """Calls the external JEV System One API to classify user intent using the `choice` primitive.
    The API expects a payload with `state` (the user message) and a `questions` map.
    Returns a dict with `pipeline` and optional `rationale` (confidence).
    """

    def __init__(self, endpoint: str, api_key: str | None = None) -> None:
        self._endpoint = endpoint.rstrip('/')
        self._api_key = api_key
        self._client = httpx.AsyncClient()

    async def _post(self, path: str, payload: dict) -> dict:
        headers = {}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        resp = await self._client.post(f"{self._endpoint}{path}", json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()

    async def classify(self, message: str) -> dict:
        payload = {
            "state": message,
            "questions": {
                "pipeline": {
                    "type": "choice",
                    "instructions": "Select the appropriate processing pipeline for the user request.",
                    "criteria": {
                        "prospectus": "Prospectus retrieval pipeline",
                        "education": "Financial education pipeline",
                        "calendar": "Calendar event extraction pipeline",
                    },
                }
            },
        }
        result = await self._post("/v1/systemone", payload)
        pipeline_info = result.get("pipeline", {})
        pipeline = pipeline_info.get("choice", "prospectus")
        rationale = pipeline_info.get("confidence")
        return {"pipeline": pipeline, "rationale": rationale}


class JEVJudgeImpl:
    """Calls the JEV endpoint to evaluate retrieval relevance.
    The API should accept a payload with the original query and a list of chunks:
    `{"query": "...", "chunks": [{"id": "...", "content": "..."}, ...]}`
    and return a float score between 0 and 1.
    """

    def __init__(self, endpoint: str) -> None:
        self._endpoint = endpoint.rstrip('/')
        self._client = httpx.AsyncClient()

    async def score(self, query: str, chunks: list[dict[str, Any]]) -> float:
        payload = {"query": query, "chunks": chunks}
        resp = await self._client.post(f"{self._endpoint}/evaluate", json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return float(data.get("score", 0.0))
