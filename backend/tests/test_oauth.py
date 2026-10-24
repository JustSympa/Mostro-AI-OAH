from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from httpx import AsyncClient
from sqlalchemy import select

from app.config import get_settings
from app.db.session import get_session_factory
from app.models import OAuthIdentity, User
from app.services.google import GoogleProfile
from tests.conftest import unique_email
from tests.helpers import register_and_login, verification_token_from_stub


async def test_google_unconfigured_returns_503(client: AsyncClient) -> None:
    start = await client.get("/auth/google")
    assert start.status_code == 503
    assert start.json()["detail"] == "Google OAuth not configured"
    callback = await client.get("/auth/google/callback", params={"code": "x", "state": "y"})
    assert callback.status_code == 503
    assert callback.json()["detail"] == "Google OAuth not configured"


async def test_google_links_verified_email_instead_of_duplicating(
    client: AsyncClient, monkeypatch
) -> None:
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
    get_settings.cache_clear()

    email = unique_email("link")
    await register_and_login(client, email)
    token = verification_token_from_stub(email)
    verified = await client.post("/auth/verify-email", json={"token": token})
    assert verified.status_code == 200

    async def fake_exchange(_code: str) -> GoogleProfile:
        return GoogleProfile(subject="google-user-123", email=email, email_verified=True)

    monkeypatch.setattr("app.services.google.exchange_code_for_profile", fake_exchange)

    start = await client.get("/auth/google", follow_redirects=False)
    assert start.status_code == 302
    state = parse_qs(urlparse(str(start.headers["location"])).query)["state"][0]

    callback = await client.get("/auth/google/callback", params={"code": "fake-code", "state": state})
    assert callback.status_code == 200
    assert callback.json()["status"] == "ok"

    factory = get_session_factory()
    async with factory() as session:
        users = (await session.execute(select(User).where(User.email == email))).scalars().all()
        assert len(users) == 1
        identities = (
            await session.execute(select(OAuthIdentity).where(OAuthIdentity.user_id == users[0].id))
        ).scalars().all()
        assert len(identities) == 1
        assert identities[0].provider_user_id == "google-user-123"

    get_settings.cache_clear()
