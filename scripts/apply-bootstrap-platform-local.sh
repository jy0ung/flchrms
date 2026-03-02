#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-supabase-db}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
PLATFORM_SQL="${ROOT_DIR}/supabase/bootstrap_platform.sql"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to apply bootstrap platform SQL locally." >&2
  exit 1
fi

if [[ ! -f "${PLATFORM_SQL}" ]]; then
  echo "Bootstrap platform file not found: ${PLATFORM_SQL}" >&2
  exit 1
fi

if ! docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
  echo "Supabase DB container '${CONTAINER_NAME}' not found." >&2
  exit 1
fi

if ! docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
  echo "Supabase DB container '${CONTAINER_NAME}' is not ready." >&2
  exit 1
fi

echo "Applying bootstrap platform SQL from ${PLATFORM_SQL} to ${CONTAINER_NAME}/${DB_NAME}..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${PLATFORM_SQL}"
echo "Bootstrap platform SQL applied successfully."
