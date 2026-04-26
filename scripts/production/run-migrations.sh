#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" run --rm backend alembic upgrade head
