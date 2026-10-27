from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import RetrievalError
from app.config import Settings
from app.models import Chunk, Document, IPO
from app.services.embeddings import VoyageEmbedder


async def embed_document(
    session: AsyncSession, document_id: uuid.UUID, settings: Settings
) -> int:
    """Replace a document's vectors atomically; the caller owns the transaction."""
    document = await session.scalar(
        select(Document).where(Document.id == document_id).with_for_update()
    )
    if document is None:
        raise RetrievalError(f"Document {document_id} was not found.")
    ipo = await session.get(IPO, document.ipo_id)
    if ipo is None:
        raise RetrievalError("Document issuer was not found.")
    chunks = list(
        await session.scalars(
            select(Chunk)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.page_number, Chunk.id)
            .with_for_update()
        )
    )
    if not chunks:
        raise RetrievalError("Document has no chunks to embed.")
    if any(not chunk.content.strip() for chunk in chunks):
        raise RetrievalError("Document contains an empty chunk; fix chunking before embedding.")
    texts = [
        f"{ipo.company_name} > {chunk.section_path}\n\n{chunk.content}"
        if chunk.section_path
        else f"{ipo.company_name}\n\n{chunk.content}"
        for chunk in chunks
    ]
    vectors = await VoyageEmbedder(settings).embed_documents(texts)
    for chunk, vector in zip(chunks, vectors, strict=True):
        chunk.embedding = vector
        chunk.embedding_model = settings.embedding_model
    await session.flush()
    return len(chunks)
