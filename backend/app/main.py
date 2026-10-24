from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api.routes.auth.router import router as auth_router
from app.api.routes.profile.router import router as profile_router
from app.config import get_settings
from app.core.limiter import limiter
from app.db.session import dispose_engine, get_engine
from app.deps.redis import close_redis, get_redis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("mostro")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    if not settings.google_oauth_configured:
        logger.warning(
            "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET unset). "
            "/auth/google endpoints will return 503; email/password + 2FA remain available."
        )
    yield
    await close_redis()
    await dispose_engine()


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse({"detail": "Too many requests. Try again later."}, status_code=429)


app = FastAPI(
    title="Mostro Auth API",
    description="User management and authentication for a trading application.",
    version="0.1.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)
app.include_router(auth_router)
app.include_router(profile_router)


@app.get("/health")
async def health(request: Request) -> JSONResponse:
    postgres = "down"
    redis = "down"
    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        postgres = "up"
    except Exception as exc:  # noqa: BLE001 — health must never raise
        logger.warning("Postgres health check failed: %s", exc)

    try:
        await get_redis().ping()
        redis = "up"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis health check failed: %s", exc)

    payload: dict[str, Any] = {
        "status": "ok" if postgres == "up" and redis == "up" else "degraded",
        "postgres": postgres,
        "redis": redis,
        "google_oauth": "configured" if get_settings().google_oauth_configured else "disabled",
    }
    status_code = 200 if payload["status"] == "ok" else 503
    return JSONResponse(payload, status_code=status_code)
