from __future__ import annotations

import argparse
import asyncio
import uuid

from app.agent.errors import RetrievalError
from app.config import get_settings
from app.db.session import dispose_engine, get_session_factory
from app.services.indexing import embed_document


async def run(document_id: uuid.UUID) -> int:
    try:
        async with get_session_factory()() as session, session.begin():
            return await embed_document(session, document_id, get_settings())
    finally:
        await dispose_engine()


def main() -> None:
    parser = argparse.ArgumentParser(description="Embed an existing document's chunks with Voyage.")
    parser.add_argument("document_id", type=uuid.UUID)
    args = parser.parse_args()
    try:
        count = asyncio.run(run(args.document_id))
    except RetrievalError as exc:
        parser.exit(1, f"Document embedding failed: {exc}\n")
    print(f"Saved {count} document embeddings for {args.document_id}.")


if __name__ == "__main__":
    main()
