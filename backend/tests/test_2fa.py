from __future__ import annotations

from httpx import AsyncClient

from app.core.security import encode_jwt
from tests.conftest import STRONG_PASSWORD, unique_email
from tests.helpers import auth_header, current_totp, register_and_login


async def _enroll(client: AsyncClient, email: str) -> tuple[str, str, list[str]]:
    access = await register_and_login(client, email)
    setup = await client.post("/auth/2fa/setup", headers=auth_header(access))
    assert setup.status_code == 200
    uri = setup.json()["otpauth_uri"]
    confirm = await client.post(
        "/auth/2fa/verify-setup",
        headers=auth_header(access),
        json={"code": current_totp(uri)},
    )
    assert confirm.status_code == 200
    codes = confirm.json()["backup_codes"]
    assert len(codes) == 10
    return access, uri, codes


async def test_2fa_login_gate_and_totp(client: AsyncClient) -> None:
    email = unique_email("2fa")
    _access, uri, _codes = await _enroll(client, email)

    login = await client.post("/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert login.status_code == 200
    body = login.json()
    assert body["status"] == "mfa_required"
    assert "access_token" not in body

    done = await client.post(
        "/auth/2fa/verify",
        json={"challenge_token": body["challenge_token"], "code": current_totp(uri)},
    )
    assert done.status_code == 200
    assert done.json()["status"] == "ok"


async def test_2fa_bypass_attempt_rejected(client: AsyncClient) -> None:
    email = unique_email("bypass")
    await _enroll(client, email)
    login = await client.post("/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    challenge = login.json()["challenge_token"]

    setup = await client.post("/auth/2fa/setup", headers=auth_header(challenge))
    assert setup.status_code == 401

    login_body = login.json()
    assert login_body["status"] == "mfa_required"


async def test_backup_code_reuse_rejected(client: AsyncClient) -> None:
    email = unique_email("backup")
    _access, _uri, codes = await _enroll(client, email)
    backup = codes[0]

    first_login = await client.post("/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    first = await client.post(
        "/auth/2fa/verify",
        json={"challenge_token": first_login.json()["challenge_token"], "code": backup},
    )
    assert first.status_code == 200

    second_login = await client.post("/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    second = await client.post(
        "/auth/2fa/verify",
        json={"challenge_token": second_login.json()["challenge_token"], "code": backup},
    )
    assert second.status_code == 401


async def test_mfa_token_is_not_an_access_token(client: AsyncClient) -> None:
    email = unique_email("aud")
    access = await register_and_login(client, email)
    from sqlalchemy import select

    from app.db.session import get_session_factory
    from app.models import User

    factory = get_session_factory()
    async with factory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        mfa = encode_jwt(subject=user.id, audience="mfa", ttl_seconds=300)

    denied = await client.post("/auth/2fa/setup", headers=auth_header(mfa))
    assert denied.status_code == 401
    allowed = await client.post("/auth/2fa/setup", headers=auth_header(access))
    assert allowed.status_code == 200
