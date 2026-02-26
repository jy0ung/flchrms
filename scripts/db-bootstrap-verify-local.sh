#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DO_SEED=0
DO_DB_TESTS=1
DO_START=1
DO_BOOTSTRAP_DEFAULTS=0
SUPABASE_CLI_VERSION="${SUPABASE_CLI_VERSION:-2.76.14}"

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CLI_CMD=(supabase)
else
  SUPABASE_CLI_CMD=(npx -y "supabase@${SUPABASE_CLI_VERSION}")
fi

usage() {
  cat <<'EOF'
Usage: bash scripts/db-bootstrap-verify-local.sh [--seed-targeted] [--apply-bootstrap-defaults] [--skip-db-tests] [--skip-start]

Resets the local Supabase database, reapplies migrations, and optionally seeds targeted test data.
Then runs DB SQL regression suites unless disabled.
Use separate scripts if you also want to apply compatibility bootstrap artifacts:
  - npm run db:bootstrap:platform:apply:local
  - npm run db:bootstrap:defaults:apply:local

Options:
  --seed-targeted   Apply supabase/seeds/targeted_test_seed.sql after reset
  --apply-bootstrap-defaults
                    Apply supabase/bootstrap_defaults.sql after migrations
  --skip-db-tests   Skip npm run test:db:sql
  --skip-start      Skip 'supabase start' (use when the local stack is already running)
  -h, --help        Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed-targeted)
      DO_SEED=1
      shift
      ;;
    --apply-bootstrap-defaults)
      DO_BOOTSTRAP_DEFAULTS=1
      shift
      ;;
    --skip-db-tests)
      DO_DB_TESTS=0
      shift
      ;;
    --skip-start)
      DO_START=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

cd "${ROOT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1 && ! command -v supabase >/dev/null 2>&1; then
  echo "Either 'supabase' or 'npx' is required." >&2
  exit 1
fi

if [[ "${DO_START}" -eq 1 ]]; then
  if docker ps --format '{{.Names}}' | grep -Eq '(^supabase-db$|^supabase_db_)'; then
    echo "Local Supabase DB container is already running; skipping 'supabase start'."
  else
    echo "Starting local Supabase (if not already running)..."
    "${SUPABASE_CLI_CMD[@]}" start
  fi
fi

echo "Resetting local Supabase DB and applying migrations..."
yes | "${SUPABASE_CLI_CMD[@]}" db reset --local

DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E '(^supabase-db$|^supabase_db_)' | head -n1 || true)"
if [[ -z "${DB_CONTAINER}" ]]; then
  echo "Unable to detect local Supabase DB container name." >&2
  docker ps --format '{{.Names}}'
  exit 1
fi

export SUPABASE_DB_CONTAINER="${DB_CONTAINER}"
echo "Using SUPABASE_DB_CONTAINER=${SUPABASE_DB_CONTAINER}"

if [[ "${DO_BOOTSTRAP_DEFAULTS}" -eq 1 ]]; then
  echo "Applying bootstrap defaults..."
  npm run db:bootstrap:defaults:apply:local
fi

if [[ "${DO_SEED}" -eq 1 ]]; then
  echo "Applying targeted test seed..."
  npm run seed:test:targeted
fi

if [[ "${DO_DB_TESTS}" -eq 1 ]]; then
  echo "Running DB SQL regression suites..."
  npm run test:db:sql
fi

echo "Local DB bootstrap/verify complete."
