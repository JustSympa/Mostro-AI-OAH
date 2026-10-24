from __future__ import annotations

from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pyotp
from httpx import AsyncClient

from tests.conftest import STRONG_PASSWORD


def verification_token_from_stub(email: str) -> str:
    path = Path("emails") / f"{email.replace('@', '_at_').replace('/', '_')}.txt"
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("token="):
            return line.split("=", 1)[1]
    raise AssertionError(f"no verification token logged for {email}")


def totp_secret_from_uri(uri: str) -> str:
    secret = parse_qs(urlparse(uri).query).get("secret", [None])[0]
    assert secret
    return secret


async def register_and_login(client: AsyncClient, email: str, password: str = STRONG_PASSWORD) -> str:
    created = await client.post("/auth/register", json={"email": email, "password": password})
    assert created.status_code == 201
    login = await client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    body = login.json()
    assert body["status"] == "ok"
    return body["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def current_totp(uri: str) -> str:
    return pyotp.TOTP(totp_secret_from_uri(uri)).now()
