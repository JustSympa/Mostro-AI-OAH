from __future__ import annotations

import asyncio

from app.db.session import get_session_factory
from app.services.source_registry import seed_source_catalog


async def seed() -> int:
    factory = get_session_factory()
    async with factory() as session:
        inserted = await seed_source_catalog(session)
        await session.commit()
    return inserted


def main() -> None:
    inserted = asyncio.run(seed())
    print(f"Inserted {inserted} inactive source catalog entries.")


if __name__ == "__main__":
    main()
