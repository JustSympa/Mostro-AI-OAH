from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import (
    AUD_ACCESS,
    AUD_MFA,
    encode_jwt,
    hash_token,
    new_raw_token,
    set_refresh_cookie,
)
from app.models import RefreshToken, User
from app.schemas.auth import MfaRequiredOut, TokenOut
from app.services.audit import write_audit


def access_payload(user: User) -> TokenOut:
    settings = get_settings()
    token = encode_jwt(
        subject=user.id,
        audience=AUD_ACCESS,
        ttl_seconds=settings.access_token_ttl_seconds,
    )
    return TokenOut(access_token=token, expires_in=settings.access_token_ttl_seconds)


def mfa_payload(user: User) -> MfaRequiredOut:
    settings = get_settings()
    token = encode_jwt(
        subject=user.id,
        audience=AUD_MFA,
        ttl_seconds=settings.mfa_challenge_ttl_seconds,
    )
    return MfaRequiredOut(challenge_token=token, expires_in=settings.mfa_challenge_ttl_seconds)


async def issue_session(
    session: AsyncSession,
    *,
    user: User,
    response: Response,
    request: Request,
    family_id: uuid.UUID | None = None,
    event: str = "session_issued",
) -> TokenOut:
    settings = get_settings()
    raw = new_raw_token()
    family = family_id or uuid.uuid4()
    row = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw),
        family_id=family,
        expires_at=datetime.now(UTC) + timedelta(seconds=settings.refresh_token_ttl_seconds),
    )
    session.add(row)
    await session.flush()
    set_refresh_cookie(response, raw)
    await write_audit(session, event=event, request=request, user_id=user.id)
    return access_payload(user)


async def rotate_refresh(
    session: AsyncSession,
    *,
    raw_token: str,
    response: Response,
    request: Request,
) -> TokenOut:
    now = datetime.now(UTC)
    token_hash = hash_token(raw_token)
    result = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    if row.revoked_at is not None and row.replaced_by_id is not None:
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == row.family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await write_audit(
            session,
            event="refresh_reuse_detected",
            request=request,
            user_id=row.user_id,
            metadata={"family_id": str(row.family_id)},
        )
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    if row.revoked_at is not None or row.expires_at <= now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    user = await session.get(User, row.user_id)
    if user is None or user.status != "active":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    new_raw = new_raw_token()
    replacement = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(new_raw),
        family_id=row.family_id,
        expires_at=now + timedelta(seconds=get_settings().refresh_token_ttl_seconds),
    )
    session.add(replacement)
    await session.flush()
    row.revoked_at = now
    row.replaced_by_id = replacement.id
    set_refresh_cookie(response, new_raw)
    await write_audit(session, event="token_refreshed", request=request, user_id=user.id)
    return access_payload(user)


async def revoke_presented_refresh(
    session: AsyncSession,
    *,
    raw_token: str | None,
    request: Request,
) -> None:
    if not raw_token:
        return
    token_hash = hash_token(raw_token)
    result = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()
    if row is None or row.revoked_at is not None:
        return
    row.revoked_at = datetime.now(UTC)
    await write_audit(session, event="logout", request=request, user_id=row.user_id)
