from __future__ import annotations

import argparse
import asyncio
import hashlib
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.errors import RetrievalError
from app.config import get_settings
from app.db.session import dispose_engine, get_session_factory
from app.models import Chunk, Document, IPO
from app.services.indexing import embed_document

MAX_SECTION_LENGTH = 255
MAX_TITLE_LENGTH = 255


@dataclass(frozen=True)
class TextChunk:
    content: str
    page_number: int
    section_path: str | None


def split_pages(text: str) -> list[str]:
    """Prospectus text extractors separate pages with form feeds."""
    return text.split("\f")


def heading_of(block: str) -> str | None:
    line = block.lstrip()
    if not line.startswith("#"):
        return None
    return line.lstrip("#").strip() or None


def paragraphs(text: str) -> list[tuple[int, str | None, str]]:
    """Flatten text into (page, section, body) triples, tracking markdown headings."""
    section: str | None = None
    blocks: list[tuple[int, str | None, str]] = []
    for page_number, page in enumerate(split_pages(text), start=1):
        for raw in page.split("\n\n"):
            block = raw.strip()
            if not block:
                continue
            heading = heading_of(block)
            if heading is not None:
                section = heading[:MAX_SECTION_LENGTH]
                continue
            blocks.append((page_number, section, " ".join(block.split())))
    return blocks


def chunk_text(text: str, *, max_chars: int) -> list[TextChunk]:
    """Pack whole paragraphs up to a soft character cap, never splitting a paragraph."""
    if max_chars < 1:
        raise ValueError("max_chars must be positive.")
    chunks: list[TextChunk] = []
    buffer: list[str] = []
    size = 0
    page_number = 1
    section_path: str | None = None
    for page, section, body in paragraphs(text):
        boundary = page != page_number or section != section_path
        if buffer and (boundary or size + len(body) > max_chars):
            chunks.append(TextChunk("\n\n".join(buffer), page_number, section_path))
            buffer, size = [], 0
        if not buffer:
            page_number, section_path = page, section
        buffer.append(body)
        size += len(body)
    if buffer:
        chunks.append(TextChunk("\n\n".join(buffer), page_number, section_path))
    return chunks


async def resolve_ipo(session: AsyncSession, reference: str) -> IPO:
    try:
        ipo_id = uuid.UUID(reference)
    except ValueError:
        ipo_id = None
    statement = select(IPO).where(IPO.id == ipo_id) if ipo_id else select(IPO).where(IPO.symbol == reference)
    ipo = await session.scalar(statement)
    if ipo is None:
        raise RetrievalError(f"No IPO matches {reference!r}; pass an IPO UUID or ticker symbol.")
    return ipo


async def ingest(
    *, reference: str, path: Path, title: str, version: str, max_chars: int
) -> tuple[uuid.UUID, int]:
    raw = path.read_bytes()
    text = raw.decode("utf-8")
    file_hash = hashlib.sha256(raw).hexdigest()
    chunks = chunk_text(text, max_chars=max_chars)
    if not chunks:
        raise RetrievalError("No indexable text found in the prospectus file.")

    factory = get_session_factory()
    async with factory() as session, session.begin():
        ipo = await resolve_ipo(session, reference)
        document = await session.scalar(select(Document).where(Document.file_hash == file_hash))
        if document is None:
            document = Document(
                ipo_id=ipo.id, title=title, file_hash=file_hash, version=version
            )
            session.add(document)
        else:
            if document.ipo_id != ipo.id:
                raise RetrievalError(
                    f"An identical file is already indexed for a different issuer ({document.ipo_id})."
                )
            document.title = title
            document.version = version
            await session.execute(delete(Chunk).where(Chunk.document_id == document.id))
        await session.flush()
        document_id = document.id
        session.add_all(
            Chunk(
                document_id=document_id,
                ipo_id=ipo.id,
                content=item.content,
                page_number=item.page_number,
                section_path=item.section_path,
            )
            for item in chunks
        )

    async with factory() as session, session.begin():
        embedded = await embed_document(session, document_id, get_settings())
    return document_id, embedded


async def run(args: argparse.Namespace) -> tuple[uuid.UUID, int]:
    try:
        return await ingest(
            reference=args.ipo,
            path=args.file,
            title=(args.title or args.file.stem)[:MAX_TITLE_LENGTH],
            version=args.version,
            max_chars=args.max_chars,
        )
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Chunk a text prospectus into documents/chunks and embed it with Voyage."
    )
    parser.add_argument("--ipo", required=True, help="IPO UUID or ticker symbol.")
    parser.add_argument("--file", required=True, type=Path, help="UTF-8 text or markdown file.")
    parser.add_argument("--title", help="Document title; defaults to the file name.")
    parser.add_argument("--version", default="1.0", help="Document version label.")
    parser.add_argument("--max-chars", type=int, default=1200, help="Soft cap per chunk.")
    args = parser.parse_args()
    try:
        document_id, embedded = asyncio.run(run(args))
    except (RetrievalError, OSError, UnicodeDecodeError, ValueError) as exc:
        parser.exit(1, f"Ingestion failed: {exc}\n")
    print(f"Ingested document {document_id} with {embedded} embedded chunks.")


if __name__ == "__main__":
    main()
