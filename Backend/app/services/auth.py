from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.passwords import password_issues
from app.core.security import hash_password, hash_token, new_raw_token, verify_password
from app.deps.redis import get_redis
from app.models import EmailVerificationToken, User
from app.schemas.auth import MfaRequiredOut, TokenOut
from app.services.audit import client_ip, write_audit
from app.services.email import email_sender
from app.services.sessions import issue_session, mfa_payload

GENERIC_LOGIN = "Invalid email or password."
REGISTER_MESSAGE = "If the email is eligible, a verification link was sent."


async def enforce_login_rate(email: str, request: Request) -> None:
    ip = client_ip(request) or "unknown"
    key = f"rl:login:{email.lower()}:{ip}"
    redis = get_redis()
    current = int(await redis.incr(key))
    if current == 1:
        await redis.expire(key, 15 * 60)
    if current > 5:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )


async def load_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(
        select(User).options(selectinload(User.two_factor)).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def register_user(session: AsyncSession, *, email: str, password: str, request: Request) -> None:
    issue = password_issues(password, email)
    if issue:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=issue)

    existing = await load_user_by_email(session, email)
    if existing is not None:
        await write_audit(
            session,
            event="register_duplicate",
            request=request,
            user_id=existing.id,
        )
        return

    user = User(email=email, password_hash=hash_password(password), status="active")
    session.add(user)
    await session.flush()

    raw = new_raw_token()
    session.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=datetime.now(UTC) + timedelta(seconds=get_settings().email_verify_ttl_seconds),
        )
    )
    await write_audit(session, event="register", request=request, user_id=user.id)
    await session.flush()

    base = get_settings().public_base_url.rstrip("/")
    body = (
        f"Welcome to Mostro.\n\n"
        f"Verify your email by POSTing this token to {base}/auth/verify-email\n\n"
        f"token={raw}\n"
        f"(Expires in 24 hours. Single use.)\n"
    )
    await email_sender.send(email, "Verify your Mostro account", body)


async def login_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    request: Request,
    response: Response,
) -> TokenOut | MfaRequiredOut:
    await enforce_login_rate(email, request)
    user = await load_user_by_email(session, email)
    password_ok = verify_password(user.password_hash if user else None, password)
    if user is None or user.password_hash is None or not password_ok or user.status != "active":
        await write_audit(
            session,
            event="login_failed",
            request=request,
            user_id=user.id if user is not None else None,
            metadata={"email_domain": email.split("@")[-1]},
        )
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN)

    if user.two_factor_enabled:
        await write_audit(session, event="login_mfa_required", request=request, user_id=user.id)
        return mfa_payload(user)

    return await issue_session(session, user=user, response=response, request=request, event="login")


async def verify_email(session: AsyncSession, *, token: str, request: Request) -> None:
    token_hash = hash_token(token)
    result = await session.execute(
        select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
    )
    row = result.scalar_one_or_none()
    now = datetime.now(UTC)
    if row is None or row.consumed_at is not None or row.expires_at <= now:
        await write_audit(session, event="email_verify_failed", request=request)
        await session.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token.")

    user = await session.get(User, row.user_id)
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token.")
    row.consumed_at = now
    if user.email_verified_at is None:
        user.email_verified_at = now
    await write_audit(session, event="email_verified", request=request, user_id=user.id)


async def set_password(
    session: AsyncSession,
    *,
    user: User,
    password: str,
    current_password: str | None,
    request: Request,
) -> None:
    issue = password_issues(password, user.email)
    if issue:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=issue)
    if user.password_hash:
        if not current_password or not verify_password(user.password_hash, current_password):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Current password is required.")
    user.password_hash = hash_password(password)
    await write_audit(session, event="password_set", request=request, user_id=user.id)
