from __future__ import annotations

import secrets
from datetime import UTC, datetime
from urllib.parse import parse_qs, urlparse

import pyotp
from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import (
    AUD_MFA,
    decode_jwt,
    decrypt_str,
    digest_equal,
    encrypt_str,
    hash_token,
    qr_svg,
    verify_password,
)
from app.models import BackupCode, TwoFactorSecret, User
from app.schemas.auth import BackupCodesOut, TokenOut, TwoFactorSetupOut
from app.services.audit import write_audit
from app.services.sessions import issue_session

ISSUER = "Mostro"


def _normalize_backup(code: str) -> str:
    return code.replace("-", "").replace(" ", "").upper()


def _generate_backup_codes(n: int = 10) -> list[str]:
    codes: list[str] = []
    for _ in range(n):
        raw = secrets.token_hex(4).upper()
        codes.append(f"{raw[:4]}-{raw[4:]}")
    return codes


async def _replace_backup_codes(session: AsyncSession, user_id, codes: list[str]) -> None:
    existing = (
        await session.execute(select(BackupCode).where(BackupCode.user_id == user_id))
    ).scalars()
    for row in existing:
        await session.delete(row)
    await session.flush()
    for code in codes:
        session.add(BackupCode(user_id=user_id, code_hash=hash_token(_normalize_backup(code))))


async def setup_totp(session: AsyncSession, *, user: User, request: Request) -> TwoFactorSetupOut:
    if user.two_factor_enabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Two-factor authentication is already enabled.")
    secret = pyotp.random_base32()
    encrypted = encrypt_str(secret)
    row = await session.get(TwoFactorSecret, user.id)
    now = datetime.now(UTC)
    if row is None:
        row = TwoFactorSecret(user_id=user.id, encrypted_secret=encrypted, enabled_at=None, disabled_at=None)
        session.add(row)
    else:
        row.encrypted_secret = encrypted
        row.enabled_at = None
        row.disabled_at = row.disabled_at or now
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=ISSUER)
    await write_audit(session, event="2fa_setup_started", request=request, user_id=user.id)
    return TwoFactorSetupOut(otpauth_uri=uri, qr_svg=qr_svg(uri))


def totp_from_uri(uri: str) -> pyotp.TOTP:
    parsed = urlparse(uri)
    secret = parse_qs(parsed.query).get("secret", [None])[0]
    if not secret:
        raise ValueError("otpauth URI missing secret")
    return pyotp.TOTP(secret)


async def confirm_setup(
    session: AsyncSession, *, user: User, code: str, request: Request
) -> BackupCodesOut:
    row = await session.get(TwoFactorSecret, user.id)
    if row is None or row.enabled_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Two-factor setup is not pending.")
    secret = decrypt_str(row.encrypted_secret)
    if not pyotp.TOTP(secret).verify(code.strip(), valid_window=1):
        await write_audit(session, event="2fa_setup_failed", request=request, user_id=user.id)
        await session.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid authentication code.")
    row.enabled_at = datetime.now(UTC)
    row.disabled_at = None
    codes = _generate_backup_codes()
    await _replace_backup_codes(session, user.id, codes)
    await write_audit(session, event="2fa_enabled", request=request, user_id=user.id)
    return BackupCodesOut(backup_codes=codes)


async def _consume_backup_code(session: AsyncSession, user_id, code: str) -> bool:
    normalized = _normalize_backup(code)
    code_hash = hash_token(normalized)
    result = await session.execute(
        select(BackupCode).where(BackupCode.user_id == user_id, BackupCode.used_at.is_(None))
    )
    for row in result.scalars():
        if digest_equal(row.code_hash, code_hash):
            row.used_at = datetime.now(UTC)
            return True
    return False


async def verify_totp_or_backup(session: AsyncSession, user: User, code: str) -> bool:
    row = user.two_factor
    if row is None or row.enabled_at is None:
        return False
    stripped = code.strip()
    secret = decrypt_str(row.encrypted_secret)
    if pyotp.TOTP(secret).verify(stripped, valid_window=1):
        return True
    return await _consume_backup_code(session, user.id, stripped)


async def complete_mfa(
    session: AsyncSession,
    *,
    challenge_token: str,
    code: str,
    request: Request,
    response: Response,
) -> TokenOut:
    try:
        payload = decode_jwt(challenge_token, audience=AUD_MFA)
    except Exception:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired challenge token.") from None
    user = (
        await session.execute(
            select(User).options(selectinload(User.two_factor)).where(User.id == payload["sub"])
        )
    ).scalar_one_or_none()
    if user is None or not user.two_factor_enabled:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired challenge token.")
    ok = await verify_totp_or_backup(session, user, code)
    if not ok:
        await write_audit(session, event="2fa_verify_failed", request=request, user_id=user.id)
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code.")
    await write_audit(session, event="2fa_verified", request=request, user_id=user.id)
    return await issue_session(session, user=user, response=response, request=request, event="login")


async def disable_2fa(
    session: AsyncSession, *, user: User, password: str, code: str, request: Request
) -> None:
    if not user.password_hash or not verify_password(user.password_hash, password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    if not user.two_factor_enabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Two-factor authentication is not enabled.")
    secret = decrypt_str(user.two_factor.encrypted_secret)  # type: ignore[union-attr]
    if not pyotp.TOTP(secret).verify(code.strip(), valid_window=1):
        await write_audit(session, event="2fa_disable_failed", request=request, user_id=user.id)
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code.")
    row = user.two_factor
    assert row is not None
    row.enabled_at = None
    row.disabled_at = datetime.now(UTC)
    row.encrypted_secret = encrypt_str("disabled")
    await _replace_backup_codes(session, user.id, [])
    await write_audit(session, event="2fa_disabled", request=request, user_id=user.id)


async def regenerate_backup_codes(
    session: AsyncSession, *, user: User, password: str, code: str, request: Request
) -> BackupCodesOut:
    if not user.password_hash or not verify_password(user.password_hash, password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    if not user.two_factor_enabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Two-factor authentication is not enabled.")
    # Regeneration requires a live TOTP, not a backup code (which would consume one).
    secret = decrypt_str(user.two_factor.encrypted_secret)  # type: ignore[union-attr]
    if not pyotp.TOTP(secret).verify(code.strip(), valid_window=1):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication code.")
    codes = _generate_backup_codes()
    await _replace_backup_codes(session, user.id, codes)
    await write_audit(session, event="2fa_backup_codes_regenerated", request=request, user_id=user.id)
    return BackupCodesOut(backup_codes=codes)
