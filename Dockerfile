# Multi-stage Dockerfile for Mostro-AI-OAH
# Stage 1: build the Next.js frontend as a static export.
FROM node:22-alpine AS frontend-base
RUN apk add --no-cache libc6-compat
WORKDIR /frontend

FROM frontend-base AS frontend-deps
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM frontend-base AS frontend-builder
WORKDIR /frontend
COPY --from=frontend-deps /frontend/node_modules ./node_modules
COPY frontend/ ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: install Python runtime + app code.
FROM python:3.12-slim AS backend-base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY backend/pyproject.toml ./
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir \
        "fastapi>=0.115.0" \
        "sse-starlette>=3.0.0" \
        "uvicorn[standard]>=0.32.0" \
        "pydantic-settings>=2.6.0" \
        "email-validator>=2.2.0" \
        "sqlalchemy[asyncio]>=2.0.36" \
        "pgvector>=0.3.6" \
        "asyncpg>=0.30.0" \
        "alembic>=1.14.0" \
        "argon2-cffi>=23.1.0" \
        "pyotp>=2.9.0" \
        "google-auth[requests]>=2.36.0" \
        "PyJWT>=2.10.0" \
        "cryptography>=44.0.0" \
        "slowapi>=0.1.9" \
        "redis>=5.2.0" \
        "zxcvbn>=4.4.28" \
        "httpx>=0.28.0" \
        "structlog>=24.4.0" \
        "qrcode>=8.0" \
        "pytest>=8.3.0" \
        "pytest-asyncio>=0.24.0"
COPY backend/ ./

# Stage 3: final image combines the FastAPI backend with the built frontend assets.
FROM backend-base AS final
COPY --from=frontend-builder /frontend/out /app/static
RUN chmod +x scripts/entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["./scripts/entrypoint.sh"]
