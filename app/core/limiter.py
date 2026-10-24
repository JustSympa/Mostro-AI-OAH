from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri=get_settings().redis_url,
    headers_enabled=True,
)
