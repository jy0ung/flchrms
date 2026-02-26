#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_FILE="${ROOT_DIR}/src/integrations/supabase/types.ts"
TMP_FILE="${OUT_FILE}.tmp"
CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-supabase-db}"
POOLER_CONTAINER_NAME="${SUPABASE_POOLER_CONTAINER:-supabase-pooler}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_CLI_VERSION="${SUPABASE_CLI_VERSION:-2.76.14}"

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CLI_CMD=(supabase)
else
  SUPABASE_CLI_CMD=(npx -y "supabase@${SUPABASE_CLI_VERSION}")
fi

cd "${ROOT_DIR}"

if ! command -v npx >/dev/null 2>&1 && ! command -v supabase >/dev/null 2>&1; then
  echo "Either 'supabase' or 'npx' is required to generate Supabase types." >&2
  exit 1
fi

echo "Generating Supabase TypeScript types from local Supabase..."
if "${SUPABASE_CLI_CMD[@]}" gen types typescript --local --schema public > "${TMP_FILE}" 2>/dev/null; then
  :
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "Failed to use --local and docker is unavailable for DB URL fallback." >&2
    rm -f "${TMP_FILE}"
    exit 1
  fi

  if ! docker inspect "${CONTAINER_NAME}" >/dev/null 2>&1; then
    echo "Failed to use --local and DB container '${CONTAINER_NAME}' was not found for fallback." >&2
    rm -f "${TMP_FILE}"
    exit 1
  fi

  DB_PORT="${SUPABASE_DB_PORT:-}"
  DB_HOST="${SUPABASE_DB_HOST:-}"
  DB_PASSWORD="$(docker exec "${CONTAINER_NAME}" printenv POSTGRES_PASSWORD || true)"
  ERR_FILE="$(mktemp)"
  GENERATED=0

  cleanup_tmp_files() {
    rm -f "${ERR_FILE}"
  }
  trap cleanup_tmp_files EXIT

  if [[ -z "${DB_PASSWORD}" ]]; then
    echo "Failed to resolve DB host/port/password for fallback type generation." >&2
    rm -f "${TMP_FILE}"
    exit 1
  fi

  try_generate_from_db_url() {
    local db_url="$1"
    local label="$2"
    rm -f "${TMP_FILE}"
    if "${SUPABASE_CLI_CMD[@]}" gen types typescript --db-url "${db_url}" --schema public > "${TMP_FILE}" 2> "${ERR_FILE}"; then
      echo "Type generation succeeded via ${label}."
      GENERATED=1
      return 0
    fi

    echo "Type generation attempt failed via ${label}; trying next fallback..." >&2
    return 1
  }

  # 1) Explicit host/port override (if provided)
  if [[ -n "${DB_HOST}" && -n "${DB_PORT}" ]]; then
    DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    try_generate_from_db_url "${DB_URL}" "SUPABASE_DB_HOST/SUPABASE_DB_PORT override" || true
  fi

  # 2) Published pooler port (preferred host-compatible fallback)
  if [[ "${GENERATED}" -eq 0 ]] && docker inspect "${POOLER_CONTAINER_NAME}" >/dev/null 2>&1; then
    POOLER_PORT="$(docker port "${POOLER_CONTAINER_NAME}" 5432/tcp 2>/dev/null | head -n1 | awk -F: '{print $NF}' || true)"
    if [[ -n "${POOLER_PORT}" ]]; then
      DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${POOLER_PORT}/${DB_NAME}"
      try_generate_from_db_url "${DB_URL}" "published supabase-pooler port" || true
    fi
  fi

  # 3) Published DB port (if directly exposed)
  if [[ "${GENERATED}" -eq 0 ]]; then
    DIRECT_DB_PORT="$(docker port "${CONTAINER_NAME}" 5432/tcp 2>/dev/null | head -n1 | awk -F: '{print $NF}' || true)"
    if [[ -n "${DIRECT_DB_PORT}" ]]; then
      DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DIRECT_DB_PORT}/${DB_NAME}"
      try_generate_from_db_url "${DB_URL}" "published ${CONTAINER_NAME} port" || true
    fi
  fi

  # 4) DB container bridge IP (Linux-host fallback)
  if [[ "${GENERATED}" -eq 0 ]]; then
    DB_HOST="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${CONTAINER_NAME}" || true)"
    if [[ -n "${DB_HOST}" ]]; then
      DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}"
      try_generate_from_db_url "${DB_URL}" "Docker bridge IP (${DB_HOST})" || true
    fi
  fi

  if [[ "${GENERATED}" -eq 0 ]]; then
    echo "All fallback type-generation connection strategies failed." >&2
    if [[ -f "${ERR_FILE}" ]]; then
      echo "--- Last error ---" >&2
      cat "${ERR_FILE}" >&2
    fi
    rm -f "${TMP_FILE}"
    exit 1
  fi
fi

mv "${TMP_FILE}" "${OUT_FILE}"
echo "Updated ${OUT_FILE}"
