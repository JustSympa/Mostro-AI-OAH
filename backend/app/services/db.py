from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.session import get_db

_userdb_engine: AsyncEngine | None = None
_userdb_factory: async_sessionmaker[AsyncSession] | None = None


async def get_user_db() -> AsyncIterator[AsyncSession]:
    """Use the primary session by default, or a separate configured UserDB."""
    global _userdb_engine, _userdb_factory
    settings = get_settings()
    if settings.agent_userdb_url == settings.database_url:
        async for session in get_db():
            yield session
        return

    if _userdb_factory is None:
        _userdb_engine = create_async_engine(settings.agent_userdb_url, pool_pre_ping=True)
        _userdb_factory = async_sessionmaker(
            _userdb_engine, expire_on_commit=False, class_=AsyncSession
        )
    async with _userdb_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_userdb_engine() -> None:
    global _userdb_engine, _userdb_factory
    if _userdb_engine is not None:
        await _userdb_engine.dispose()
    _userdb_engine = None
    _userdb_factory = None