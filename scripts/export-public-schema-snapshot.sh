#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-supabase-db}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
OUT_FILE="${ROOT_DIR}/supabase/schema_snapshot.public.sql"
TMP_FILE="${OUT_FILE}.tmp"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to export the schema snapshot." >&2
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

mkdir -p "$(dirname "${OUT_FILE}")"

{
  echo "-- HRMS Public Schema Snapshot"
  echo "-- Generated from local Supabase DB container '${CONTAINER_NAME}'"
  echo "-- Schema-only snapshot for deterministic review/diff."
  echo "-- Note: bootstrap defaults/seeds remain in migrations/default_schema until Phase 8B split."
  echo
  docker exec "${CONTAINER_NAME}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --schema=public
} > "${TMP_FILE}"

# Reduce noisy diffs when pg_dump client/server versions change.
sed -i \
  -e '/^-- Dumped from database version /d' \
  -e '/^-- Dumped by pg_dump version /d' \
  "${TMP_FILE}"

mv "${TMP_FILE}" "${OUT_FILE}"

echo "Exported public schema snapshot to ${OUT_FILE}"
