# Multi‑stage Dockerfile for Mostro‑AI‑OAH
# Stage 1 – build the Next.js frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Build a static production bundle (output in .next and public)
RUN npm run build

# Stage 2 – install Python dependencies for the backend
FROM python:3.12-slim AS backend-base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY backend/pyproject.toml ./
# Install the backend and its optional dev extras (including uv, ruff, etc.)
RUN pip install --no-cache-dir ".[dev]"
COPY backend/ ./

# Stage 3 – final image combines backend + compiled frontend assets
FROM backend-base AS final
# Copy the static assets produced by the frontend build into a location served by FastAPI
COPY --from=frontend-builder /frontend/.next /app/static/.next
COPY --from=frontend-builder /frontend/public /app/static/public
COPY --from=frontend-builder /frontend/next.config.mjs /app/static/next.config.mjs
# Ensure the entrypoint script is executable
RUN chmod +x scripts/entrypoint.sh
EXPOSE 8000
ENTRYPOINT ["./scripts/entrypoint.sh"]
