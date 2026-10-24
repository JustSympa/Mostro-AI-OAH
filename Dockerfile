# --- Stage 1: Build Next.js Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Declare build arguments for static export
ARG NEXT_PUBLIC_API_BASE_URL=/api

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Final Python Runtime ---
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-builder /app/frontend/out ./app/static

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
