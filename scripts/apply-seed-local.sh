#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED_SQL="${ROOT_DIR}/supabase/seed.sql"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to apply local seed SQL." >&2
  exit 1
fi

if [[ ! -f "${SEED_SQL}" ]]; then
  echo "Seed file not found: ${SEED_SQL}" >&2
  exit 1
fi

CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-}"
if [[ -z "${CONTAINER_NAME}" ]]; then
  CONTAINER_NAME="$(docker ps --format '{{.Names}}' | grep -E '(^supabase-db$|^supabase_db_)' | head -n1 || true)"
fi

if [[ -z "${CONTAINER_NAME}" ]]; then
  echo "Could not detect local Supabase DB container. Start the stack first." >&2
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

echo "Applying local seed SQL (${SEED_SQL}) to ${CONTAINER_NAME}/${DB_NAME}..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f - < "${SEED_SQL}"
echo "Local seed SQL applied successfully."
