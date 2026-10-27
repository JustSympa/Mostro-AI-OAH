from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Protocol

from app.agent.errors import RefusalError, RetrievalError
from app.config import Settings
from app.models import Chunk
from app.services.agent_data import ZetarisAgentData
from app.services.embeddings import Embedder
from app.services.jev import JEVJudgeImpl


@dataclass(frozen=True)
class RetrievedChunk:
    chunk: Chunk
    score: float


class RetrievalJudge(Protocol):
    async def score(self, query: str, chunks: list[RetrievedChunk]) -> float: ...


class SimilarityJudge:
    """Deterministic baseline; inject a JEV-backed judge for production evaluation."""

    async def score(self, _query: str, chunks: list[RetrievedChunk]) -> float:
        return max((item.score for item in chunks), default=0.0)


class QueryRewriter:
    async def rewrite(self, query: str, attempt: int) -> str:
        if attempt == 0:
            return query
        return f"{query} IPO prospectus official terms dates and risks"


class ProspectusRetriever:
    def __init__(
        self,
        data: ZetarisAgentData,
        embedder: Embedder,
        settings: Settings,
        rewriter: QueryRewriter | None = None,
        judge: RetrievalJudge | None = None,
    ) -> None:
        self._data = data
        self._embedder = embedder
        self._settings = settings
        self._rewriter = rewriter or QueryRewriter()
        self._judge: RetrievalJudge = judge or (
            JEVJudgeImpl(settings.jev_endpoint, settings.jev_api_key, settings.jev_model)
            if settings.jev_endpoint
            else SimilarityJudge()
        )

    async def retrieve(self, query: str, ipo_id: uuid.UUID, *, limit: int = 8) -> list[RetrievedChunk]:
        rewritten = query
        vectors: dict[str, list[float]] = {}
        for attempt in range(max(1, self._settings.retrieval_max_attempts)):
            try:
                if rewritten not in vectors:
                    vectors[rewritten] = await self._embedder.embed(rewritten)
                vector = vectors[rewritten]
            except RetrievalError as exc:
                raise RefusalError(str(exc)) from exc
            rows = await self._data.chunks(ipo_id, vector, limit=limit)
            chunks = [
                RetrievedChunk(chunk=chunk, score=score)
                for chunk, score in rows
            ]
            score = await self._judge.score(query, chunks)
            if chunks and score >= self._settings.retrieval_threshold:
                return chunks
            if attempt + 1 < max(1, self._settings.retrieval_max_attempts):
                rewritten = await self._rewriter.rewrite(query, attempt + 1)
        raise RefusalError("I could not find sufficiently relevant verified prospectus information.")


def build_prospectus_context(chunks: list[RetrievedChunk]) -> str:
    return "\n\n".join(
        f"[Page {item.chunk.page_number}; relevance {item.score:.2f}]\n{item.chunk.content}"
        for item in chunks
    )