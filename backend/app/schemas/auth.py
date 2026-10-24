from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=256)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class VerifyEmailIn(BaseModel):
    token: str = Field(min_length=8, max_length=512)


class SetPasswordIn(BaseModel):
    password: str = Field(min_length=12, max_length=256)
    current_password: str | None = Field(default=None, max_length=256)


class MessageOut(BaseModel):
    message: str


class TokenOut(BaseModel):
    status: Literal["ok"] = "ok"
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class MfaRequiredOut(BaseModel):
    status: Literal["mfa_required"] = "mfa_required"
    challenge_token: str
    expires_in: int


class TwoFactorSetupOut(BaseModel):
    otpauth_uri: str
    qr_svg: str


class TwoFactorConfirmIn(BaseModel):
    code: str = Field(min_length=6, max_length=16)


class BackupCodesOut(BaseModel):
    backup_codes: list[str]


class TwoFactorVerifyIn(BaseModel):
    challenge_token: str
    code: str = Field(min_length=6, max_length=32)


class TwoFactorDisableIn(BaseModel):
    password: str = Field(min_length=1, max_length=256)
    code: str = Field(min_length=6, max_length=16)


class TwoFactorRegenIn(BaseModel):
    password: str = Field(min_length=1, max_length=256)
    code: str = Field(min_length=6, max_length=16)
