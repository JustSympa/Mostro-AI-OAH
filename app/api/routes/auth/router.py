from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.core.security import REFRESH_COOKIE, clear_refresh_cookie
from app.db.session import get_db
from app.deps.auth import get_current_user, get_current_user_optional
from app.models import User
from app.schemas.auth import (
    BackupCodesOut,
    LoginIn,
    MessageOut,
    MfaRequiredOut,
    RegisterIn,
    SetPasswordIn,
    TokenOut,
    TwoFactorConfirmIn,
    TwoFactorDisableIn,
    TwoFactorRegenIn,
    TwoFactorSetupOut,
    TwoFactorVerifyIn,
    VerifyEmailIn,
)
from app.services import auth as auth_service
from app.services import google as google_service
from app.services import two_factor as two_factor_service
from app.services.sessions import revoke_presented_refresh, rotate_refresh

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    payload: RegisterIn,
    session: AsyncSession = Depends(get_db),
) -> MessageOut:
    await auth_service.register_user(
        session, email=str(payload.email), password=payload.password, request=request
    )
    return MessageOut(message=auth_service.REGISTER_MESSAGE)


@router.post("/login", response_model=TokenOut | MfaRequiredOut)
@limiter.limit("20/minute")
async def login(
    request: Request,
    payload: LoginIn,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> TokenOut | MfaRequiredOut:
    return await auth_service.login_user(
        session,
        email=str(payload.email),
        password=payload.password,
        request=request,
        response=response,
    )


@router.post("/verify-email", response_model=MessageOut)
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    payload: VerifyEmailIn,
    session: AsyncSession = Depends(get_db),
) -> MessageOut:
    await auth_service.verify_email(session, token=payload.token, request=request)
    return MessageOut(message="Email verified.")


@router.post("/logout", response_model=MessageOut)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> MessageOut:
    await revoke_presented_refresh(
        session, raw_token=request.cookies.get(REFRESH_COOKIE), request=request
    )
    clear_refresh_cookie(response)
    return MessageOut(message="Logged out.")


@router.post("/refresh", response_model=TokenOut)
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> TokenOut:
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")
    return await rotate_refresh(session, raw_token=raw, response=response, request=request)


@router.post("/set-password", response_model=MessageOut)
async def set_password(
    request: Request,
    payload: SetPasswordIn,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageOut:
    await auth_service.set_password(
        session,
        user=user,
        password=payload.password,
        current_password=payload.current_password,
        request=request,
    )
    return MessageOut(message="Password updated.")


@router.get("/google")
@limiter.limit("10/minute")
async def google_start(
    request: Request,
    creds_user: User | None = Depends(get_current_user_optional),
) -> RedirectResponse:
    google_service.require_google_configured()
    url = await google_service.start_google_login(
        linking_user_id=str(creds_user.id) if creds_user else None
    )
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


@router.get("/google/callback", response_model=TokenOut | MfaRequiredOut)
@limiter.limit("10/minute")
async def google_callback(
    request: Request,
    response: Response,
    code: str | None = None,
    state: str | None = None,
    session: AsyncSession = Depends(get_db),
) -> TokenOut | MfaRequiredOut:
    google_service.require_google_configured()
    if not code or not state:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Google authentication failed.")
    return await google_service.complete_google_login(
        session, code=code, state=state, request=request, response=response
    )


@router.post("/2fa/setup", response_model=TwoFactorSetupOut)
async def two_factor_setup(
    request: Request,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TwoFactorSetupOut:
    return await two_factor_service.setup_totp(session, user=user, request=request)


@router.post("/2fa/verify-setup", response_model=BackupCodesOut)
async def two_factor_verify_setup(
    request: Request,
    payload: TwoFactorConfirmIn,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BackupCodesOut:
    return await two_factor_service.confirm_setup(
        session, user=user, code=payload.code, request=request
    )


@router.post("/2fa/verify", response_model=TokenOut)
@limiter.limit("10/minute")
async def two_factor_verify(
    request: Request,
    payload: TwoFactorVerifyIn,
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> TokenOut:
    return await two_factor_service.complete_mfa(
        session,
        challenge_token=payload.challenge_token,
        code=payload.code,
        request=request,
        response=response,
    )


@router.post("/2fa/disable", response_model=MessageOut)
async def two_factor_disable(
    request: Request,
    payload: TwoFactorDisableIn,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageOut:
    await two_factor_service.disable_2fa(
        session, user=user, password=payload.password, code=payload.code, request=request
    )
    return MessageOut(message="Two-factor authentication disabled.")


@router.post("/2fa/backup-codes", response_model=BackupCodesOut)
async def two_factor_regen(
    request: Request,
    payload: TwoFactorRegenIn,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BackupCodesOut:
    return await two_factor_service.regenerate_backup_codes(
        session, user=user, password=payload.password, code=payload.code, request=request
    )
