from __future__ import annotations

import base64
import hashlib
import hmac
import io
import os
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
import qrcode
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import Response
from qrcode.image.svg import SvgPathImage

from app.config import get_settings

AUD_ACCESS: Literal["access"] = "access"
AUD_MFA: Literal["mfa"] = "mfa"
REFRESH_COOKIE = "refresh_token"

_hasher = PasswordHasher()
# Dummy hash so missing-user password checks take the same path as a real verify.
_DUMMY_HASH = _hasher.hash("not-a-real-password-used-only-for-timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    target = password_hash or _DUMMY_HASH
    try:
        return _hasher.verify(target, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def new_raw_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def digest_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)


def encrypt_str(plaintext: str) -> str:
    key = get_settings().aes_key_bytes
    nonce = os.urandom(12)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_str(blob: str) -> str:
    key = get_settings().aes_key_bytes
    raw = base64.b64decode(blob)
    nonce, ciphertext = raw[:12], raw[12:]
    return AESGCM(key).decrypt(nonce, ciphertext, None).decode("utf-8")


def encode_jwt(*, subject: uuid.UUID, audience: str, ttl_seconds: int) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "aud": audience,
        "iat": now,
        "exp": now + timedelta(seconds=ttl_seconds),
        "jti": secrets.token_urlsafe(8),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_jwt(token: str, *, audience: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience=audience,
    )


def qr_svg(data: str) -> str:
    image = qrcode.make(data, image_factory=SvgPathImage)
    buffer = io.BytesIO()
    image.save(buffer)
    return buffer.getvalue().decode("utf-8")


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    settings = get_settings()
    kwargs: dict[str, Any] = {
        "key": REFRESH_COOKIE,
        "value": raw_token,
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "strict",
        "max_age": settings.refresh_token_ttl_seconds,
        "path": "/",
    }
    if settings.cookie_domain:
        kwargs["domain"] = settings.cookie_domain
    response.set_cookie(**kwargs)


def clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=REFRESH_COOKIE,
        path="/",
        domain=settings.cookie_domain,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
    )
