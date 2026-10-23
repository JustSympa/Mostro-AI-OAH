from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.config import get_settings
from app.db.base import Base
from app.db.session import dispose_engine, get_engine, get_session_factory
from app.deps.redis import close_redis, get_redis
from app.main import app


@pytest.fixture(scope="session", autouse=True)
async def _prepare_backend() -> None:
    get_settings.cache_clear()
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    redis = get_redis()
    await redis.ping()
    yield
    await close_redis()
    await dispose_engine()


@pytest.fixture(autouse=True)
async def _clean_state() -> None:
    engine = get_engine()
    table_names = [table.name for table in Base.metadata.sorted_tables]
    if table_names:
        quoted = ", ".join(f'"{name}"' for name in table_names)
        async with engine.begin() as conn:
            await conn.execute(text(f"TRUNCATE TABLE {quoted} CASCADE"))
    await get_redis().flushdb()
    yield


@pytest.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


STRONG_PASSWORD = "correct horse battery staple 9X"


def unique_email(prefix: str = "user") -> str:
    return f"{prefix}-{os.urandom(4).hex()}@example.com"
