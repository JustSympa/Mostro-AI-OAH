from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import AUD_ACCESS, decode_jwt
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    try:
        payload = decode_jwt(creds.credentials, audience=AUD_ACCESS)
        user_id = uuid.UUID(payload["sub"])
    except (InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.") from None
    user = (
        await session.execute(
            select(User).options(selectinload(User.two_factor)).where(User.id == user_id)
        )
    ).scalar_one_or_none()
    if user is None or user.status != "active":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return user


async def get_current_user_optional(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> User | None:
    if creds is None:
        return None
    try:
        return await get_current_user(creds=creds, session=session)
    except HTTPException:
        return None
