#!/usr/bin/env python3
"""Bounded retry until Postgres accepts a real query (not just TCP)."""

from __future__ import annotations

import asyncio
import os
import sys
import time

import asyncpg


def _dsn() -> str:
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://mostro:mostro@postgres:5432/mostro",
    )
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


async def wait() -> None:
    dsn = _dsn()
    deadline = time.monotonic() + 30.0
    delay = 0.2
    last_error = "unknown"
    while time.monotonic() < deadline:
        try:
            conn = await asyncpg.connect(dsn, timeout=2)
            try:
                await conn.execute("SELECT 1")
            finally:
                await conn.close()
            print("Postgres accepted a query.", flush=True)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            await asyncio.sleep(delay)
            delay = min(delay * 1.5, 2.0)
    print(f"ERROR: Postgres not ready within 30s ({last_error})", file=sys.stderr, flush=True)
    sys.exit(1)


if __name__ == "__main__":
    asyncio.run(wait())
