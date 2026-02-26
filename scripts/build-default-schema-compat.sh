#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_FILE="${ROOT_DIR}/supabase/default_schema.sql"
SCHEMA_SNAPSHOT="${ROOT_DIR}/supabase/schema_snapshot.public.sql"
BOOTSTRAP_PLATFORM="${ROOT_DIR}/supabase/bootstrap_platform.sql"
BOOTSTRAP_DEFAULTS="${ROOT_DIR}/supabase/bootstrap_defaults.sql"
TMP_FILE="${OUT_FILE}.tmp"

for f in "${SCHEMA_SNAPSHOT}" "${BOOTSTRAP_PLATFORM}" "${BOOTSTRAP_DEFAULTS}"; do
  if [[ ! -f "${f}" ]]; then
    echo "Required input file missing: ${f}" >&2
    exit 1
  fi
done

{
  echo "-- GENERATED FILE - DO NOT EDIT"
  echo "--"
  echo "-- HRMS Default Schema Compatibility Bundle"
  echo "--"
  echo "-- Generated from:"
  echo "--   1) supabase/schema_snapshot.public.sql   (public schema state snapshot)"
  echo "--   2) supabase/bootstrap_platform.sql       (non-public app platform artifacts)"
  echo "--   3) supabase/bootstrap_defaults.sql       (idempotent app defaults)"
  echo "--"
  echo "-- Source of truth remains:"
  echo "--   - supabase/migrations/"
  echo "--"
  echo
  echo "-- ===== BEGIN: public schema snapshot ====="
  cat "${SCHEMA_SNAPSHOT}"
  echo
  echo "-- ===== END: public schema snapshot ====="
  echo
  echo "-- ===== BEGIN: platform bootstrap (non-public app artifacts) ====="
  cat "${BOOTSTRAP_PLATFORM}"
  echo
  echo "-- ===== END: platform bootstrap ====="
  echo
  echo "-- ===== BEGIN: app bootstrap defaults ====="
  cat "${BOOTSTRAP_DEFAULTS}"
  echo
  echo "-- ===== END: app bootstrap defaults ====="
} > "${TMP_FILE}"

mv "${TMP_FILE}" "${OUT_FILE}"
echo "Generated compatibility bundle: ${OUT_FILE}"
