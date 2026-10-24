from __future__ import annotations

import json
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, Request, Response, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.deps.redis import get_redis
from app.models import OAuthIdentity, User
from app.schemas.auth import MfaRequiredOut, TokenOut
from app.services.audit import write_audit
from app.services.sessions import issue_session, mfa_payload

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
STATE_TTL = 600


@dataclass(frozen=True)
class GoogleProfile:
    subject: str
    email: str
    email_verified: bool


class GoogleOAuthError(RuntimeError):
    pass


def google_not_configured() -> HTTPException:
    return HTTPException(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Google OAuth not configured",
    )


def require_google_configured() -> None:
    if not get_settings().google_oauth_configured:
        raise google_not_configured()


async def start_google_login(*, linking_user_id: str | None = None) -> str:
    require_google_configured()
    settings = get_settings()
    state = secrets.token_urlsafe(32)
    payload = {"nonce": secrets.token_urlsafe(16), "user_id": linking_user_id}
    await get_redis().setex(f"oauth:google:{state}", STATE_TTL, json.dumps(payload))
    query = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "nonce": payload["nonce"],
            "access_type": "online",
            "prompt": "select_account",
        }
    )
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_code_for_profile(code: str) -> GoogleProfile:
    """Exchange an authorization code and verify the ID token. Overridable in tests."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if token_response.status_code != 200:
        raise GoogleOAuthError("token_exchange_failed")
    id_token = token_response.json().get("id_token")
    if not id_token:
        raise GoogleOAuthError("missing_id_token")
    claims = google_id_token.verify_oauth2_token(
        id_token,
        google_requests.Request(),
        settings.google_client_id,
    )
    email = claims.get("email")
    subject = claims.get("sub")
    if not email or not subject:
        raise GoogleOAuthError("incomplete_claims")
    return GoogleProfile(
        subject=str(subject),
        email=str(email),
        email_verified=bool(claims.get("email_verified")),
    )


async def complete_google_login(
    session: AsyncSession,
    *,
    code: str,
    state: str,
    request: Request,
    response: Response,
) -> TokenOut | MfaRequiredOut:
    require_google_configured()
    raw_state = await get_redis().get(f"oauth:google:{state}")
    await get_redis().delete(f"oauth:google:{state}")
    if not raw_state:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state.")
    state_data = json.loads(raw_state)
    try:
        profile = await exchange_code_for_profile(code)
    except GoogleOAuthError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Google authentication failed.") from None

    identity = (
        await session.execute(
            select(OAuthIdentity).where(
                OAuthIdentity.provider == "google",
                OAuthIdentity.provider_user_id == profile.subject,
            )
        )
    ).scalar_one_or_none()

    linking_user_id = state_data.get("user_id")
    if identity is not None:
        user = (
            await session.execute(
                select(User).options(selectinload(User.two_factor)).where(User.id == identity.user_id)
            )
        ).scalar_one()
        if linking_user_id and str(user.id) != linking_user_id:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="This Google account is already linked to another user.",
            )
    else:
        user = await _link_or_create(session, profile, linking_user_id)

    if user.two_factor_enabled:
        await write_audit(session, event="google_login_mfa_required", request=request, user_id=user.id)
        return mfa_payload(user)
    return await issue_session(
        session, user=user, response=response, request=request, event="google_login"
    )


async def _link_or_create(
    session: AsyncSession, profile: GoogleProfile, linking_user_id: str | None
) -> User:
    if linking_user_id:
        user = (
            await session.execute(
                select(User).options(selectinload(User.two_factor)).where(User.id == linking_user_id)
            )
        ).scalar_one_or_none()
        if user is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Google authentication failed.")
        existing = (
            await session.execute(select(User).where(User.email == profile.email))
        ).scalar_one_or_none()
        if existing is not None and existing.id != user.id:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail="This Google account is already linked to another user.",
            )
        session.add(
            OAuthIdentity(user_id=user.id, provider="google", provider_user_id=profile.subject)
        )
        if profile.email_verified and user.email_verified_at is None and user.email.lower() == profile.email.lower():
            user.email_verified_at = datetime.now(UTC)
        return user

    existing = (
        await session.execute(
            select(User).options(selectinload(User.two_factor)).where(User.email == profile.email)
        )
    ).scalar_one_or_none()
    if existing is not None:
        if not profile.email_verified:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Google authentication failed.",
            )
        if existing.email_verified_at is None:
            existing.email_verified_at = datetime.now(UTC)
        session.add(
            OAuthIdentity(user_id=existing.id, provider="google", provider_user_id=profile.subject)
        )
        return existing

    user = User(
        email=profile.email,
        password_hash=None,
        status="active",
        email_verified_at=datetime.now(UTC) if profile.email_verified else None,
    )
    session.add(user)
    await session.flush()
    session.add(OAuthIdentity(user_id=user.id, provider="google", provider_user_id=profile.subject))
    return (
        await session.execute(
            select(User).options(selectinload(User.two_factor)).where(User.id == user.id)
        )
    ).scalar_one()
