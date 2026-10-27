# Multi-stage Dockerfile for Mostro-AI-OAH.
#
# The whole stack is built and launched from the repository root:
#   docker compose up -d --build
#
# Build targets:
#   api -> FastAPI backend (auth, profile, agent /sse, memory), listens on 8000
#   web -> nginx serving the static Next.js export, listens on 3000
#
# Build a single target directly with:
#   docker build --target api -t mostro-api .
#   docker build --target web -t mostro-web .

# ── Stage 1: build the Next.js frontend as a static export ───────
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

# ── Stage 2: Python runtime + backend code ──────────────────────
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

# ── Target: api (FastAPI on 8000) ───────────────────────────────
# The frontend is no longer embedded here: it runs as its own `web`
# container. Without a `static/` directory, main.py skips the catch-all
# StaticFiles mount, which is what previously shadowed the /health route.
FROM backend-base AS api
RUN chmod +x scripts/entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["./scripts/entrypoint.sh"]

# ── Target: web (static export served by nginx on 3000) ─────────
FROM nginx:1.27-alpine AS web
COPY --from=frontend-builder /frontend/out /usr/share/nginx/html
RUN printf '%s\n' \
    'server {' \
    '    listen 3000;' \
    '    listen [::]:3000;' \
    '    server_name _;' \
    '' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '' \
    '    location /_next/static/ {' \
    '        expires 1y;' \
    '        add_header Cache-Control "public, immutable";' \
    '    }' \
    '' \
    '    # Next.js static export (trailingSlash: true) emits <route>/index.html' \
    '    location / {' \
    '        try_files $uri $uri/index.html $uri.html /index.html;' \
    '    }' \
    '}' \
    > /etc/nginx/conf.d/default.conf
EXPOSE 3000
