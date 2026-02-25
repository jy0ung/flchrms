#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-supabase-db}"
SQL_FILE="${ROOT_DIR}/supabase/tests/state_machine_regression.sql"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to run state-machine SQL regression checks." >&2
  exit 1
fi

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Missing SQL test file: ${SQL_FILE}" >&2
  exit 1
fi

if ! docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  echo "Supabase DB container '${CONTAINER_NAME}' not found." >&2
  exit 1
fi

if ! docker exec "${CONTAINER_NAME}" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
  echo "Supabase DB container '${CONTAINER_NAME}' is not ready." >&2
  exit 1
fi

echo "Running state-machine SQL regression checks against container '${CONTAINER_NAME}'..."
docker exec -i "${CONTAINER_NAME}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < "${SQL_FILE}"
