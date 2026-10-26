# ╔══════════════════════════════════════════════════════════════╗
# ║  This project uses docker compose for multi-service builds.  ║
# ║                                                              ║
# ║  To run everything:                                          ║
# ║    cp .env.example .env                                      ║
# ║    docker compose up --build                                 ║
# ║                                                              ║
# ║  Individual service Dockerfiles live in:                     ║
# ║    backend/Dockerfile   — FastAPI + Alembic                  ║
# ║    frontend/Dockerfile  — Next.js standalone                 ║
# ╚══════════════════════════════════════════════════════════════╝
#
# This root Dockerfile is intentionally a passthrough to the backend
# image only, used for single-service deploys (e.g. Railway, Render).

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY backend/pyproject.toml .
RUN mkdir -p app && printf '' > app/__init__.py \
    && pip install --no-cache-dir ".[dev]" \
    && rm -rf app

COPY backend/ .

RUN chmod +x scripts/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./scripts/entrypoint.sh"]
