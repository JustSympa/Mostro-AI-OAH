#!/bin/sh
set -eu

python /app/scripts/wait_for_postgres.py

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
