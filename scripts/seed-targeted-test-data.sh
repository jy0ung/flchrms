#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-supabase-db}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
SQL_FILE="${ROOT_DIR}/supabase/seeds/targeted_test_seed.sql"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to run the targeted seed." >&2
  exit 1
fi

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Missing seed SQL file: ${SQL_FILE}" >&2
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

echo "Applying targeted test seed to '${CONTAINER_NAME}' (${DB_NAME})..."
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f - < "${SQL_FILE}"

cat <<'EOF'

Targeted test seed applied.

Default test password (all roles):
  Test1234!

Quick E2E setup:
  1. cp .env.e2e.test-seed.example .env.e2e.test-seed
  2. set -a; source .env.e2e.test-seed; set +a
  3. npm run test:rbac:e2e:phase3b

Credential reference:
  docs/test-seed-credentials.md
EOF
