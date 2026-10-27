from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import RefusalError, RetrievalError
from app.config import Settings
from app.models import Chunk, Document
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
        session: AsyncSession,
        embedder: Embedder,
        settings: Settings,
        rewriter: QueryRewriter | None = None,
        judge: RetrievalJudge | None = None,
    ) -> None:
        self._session = session
        self._embedder = embedder
        self._settings = settings
        self._rewriter = rewriter or QueryRewriter()
        self._judge = judge or (JEVJudgeImpl(settings.jev_endpoint) if getattr(settings, 'jev_endpoint', None) else SimilarityJudge())

    async def retrieve(self, query: str, ipo_id: uuid.UUID, *, limit: int = 8) -> list[RetrievedChunk]:
        rewritten = query
        for attempt in range(max(1, self._settings.retrieval_max_attempts)):
            try:
                vector = await self._embedder.embed(rewritten)
            except RetrievalError as exc:
                raise RefusalError(str(exc)) from exc
            distance = Chunk.embedding.cosine_distance(vector).label("distance")
            rows = (
                await self._session.execute(
                    select(Chunk, distance)
                    .join(Document, Document.id == Chunk.document_id)
                    .where(
                        Chunk.ipo_id == ipo_id,
                        Chunk.embedding.is_not(None),
                        Document.status == "indexed",
                    )
                    .order_by(distance)
                    .limit(limit)
                )
            ).all()
            chunks = [
                RetrievedChunk(chunk=chunk, score=max(0.0, 1.0 - float(distance_value)))
                for chunk, distance_value in rows
            ]
            # If using JEVJudgeImpl, convert chunks to plain dicts expected by the service
if isinstance(self._judge, JEVJudgeImpl):
    chunk_dicts = [
        {"id": str(chunk.chunk.id), "content": chunk.chunk.content}
        for chunk in chunks
    ]
    score = await self._judge.score(rewritten, chunk_dicts)
else:
    score = await self._judge.score(rewritten, chunks)
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