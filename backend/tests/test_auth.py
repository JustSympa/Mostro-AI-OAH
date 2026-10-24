from __future__ import annotations

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import select

from app.core.security import hash_token
from app.db.session import get_session_factory
from app.models import EmailVerificationToken, User
from tests.conftest import STRONG_PASSWORD, unique_email
from tests.helpers import register_and_login, verification_token_from_stub


async def test_register_login_refresh_logout(client: AsyncClient) -> None:
    email = unique_email("login")
    token = await register_and_login(client, email)
    assert token

    refresh = await client.post("/auth/refresh")
    assert refresh.status_code == 200
    assert refresh.json()["status"] == "ok"

    logout = await client.post("/auth/logout")
    assert logout.status_code == 200
    again = await client.post("/auth/refresh")
    assert again.status_code == 401


async def test_login_does_not_reveal_unknown_email(client: AsyncClient) -> None:
    response = await client.post(
        "/auth/login",
        json={"email": unique_email("missing"), "password": STRONG_PASSWORD},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


async def test_weak_password_rejected(client: AsyncClient) -> None:
    response = await client.post(
        "/auth/register",
        json={"email": unique_email("weak"), "password": "aaaaaaaaaaaa"},
    )
    assert response.status_code == 422


async def test_verify_email_happy_path(client: AsyncClient) -> None:
    email = unique_email("verify")
    await register_and_login(client, email)
    raw = verification_token_from_stub(email)
    verified = await client.post("/auth/verify-email", json={"token": raw})
    assert verified.status_code == 200
    reused = await client.post("/auth/verify-email", json={"token": raw})
    assert reused.status_code == 400


async def test_expired_verification_token(client: AsyncClient) -> None:
    email = unique_email("expired")
    await register_and_login(client, email)
    factory = get_session_factory()
    async with factory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        raw = "expired-token-value-for-test"
        session.add(
            EmailVerificationToken(
                user_id=user.id,
                token_hash=hash_token(raw),
                expires_at=datetime.now(UTC) - timedelta(hours=1),
            )
        )
        await session.commit()
    response = await client.post("/auth/verify-email", json={"token": raw})
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()


async def test_refresh_reuse_revokes_family(client: AsyncClient) -> None:
    email = unique_email("reuse")
    await register_and_login(client, email)
    old_refresh = client.cookies.get("refresh_token")
    assert old_refresh

    rotated = await client.post("/auth/refresh")
    assert rotated.status_code == 200
    new_refresh = client.cookies.get("refresh_token")
    assert new_refresh
    assert new_refresh != old_refresh

    client.cookies.set("refresh_token", old_refresh)
    reused = await client.post("/auth/refresh")
    assert reused.status_code == 401

    client.cookies.set("refresh_token", new_refresh)
    after_reuse = await client.post("/auth/refresh")
    assert after_reuse.status_code == 401
