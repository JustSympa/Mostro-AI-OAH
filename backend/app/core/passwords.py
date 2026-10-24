from __future__ import annotations

from zxcvbn import zxcvbn

MIN_PASSWORD_LENGTH = 12
MIN_ZXCVBN_SCORE = 3


def password_issues(password: str, email: str | None = None) -> str | None:
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    user_inputs = [email] if email else []
    score = int(zxcvbn(password, user_inputs=user_inputs)["score"])
    if score < MIN_ZXCVBN_SCORE:
        return "Password is too weak. Use a longer passphrase with mixed words."
    return None
