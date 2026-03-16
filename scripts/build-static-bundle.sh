#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="production"
ENV_FILE=""
DIST_DIR="${ROOT_DIR}/dist"
MODE="production"

usage() {
  cat <<'EOF'
Usage: bash scripts/build-static-bundle.sh --env-file <path> [OPTIONS]

Options:
  --env-file <path>     Explicit env file used for the bundle build.
  --target <target>     Build target: production | test (default: production)
  --mode <mode>         Vite mode to build (default: production)
  --dist-dir <path>     Dist directory to verify after build (default: ./dist)
  -h, --help            Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --target)
      TARGET="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --dist-dir)
      DIST_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${ENV_FILE}" ]]; then
  echo "Error: --env-file is required." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: env file not found: ${ENV_FILE}" >&2
  exit 1
fi

case "${TARGET}" in
  production|test)
    ;;
  *)
    echo "Error: --target must be production or test." >&2
    exit 1
    ;;
esac

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to build the frontend bundle." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required to build the frontend bundle." >&2
  exit 1
fi

load_build_env() {
  unset VITE_SUPABASE_URL
  unset VITE_SUPABASE_PUBLISHABLE_KEY
  unset VITE_SUPABASE_ANON_KEY
  unset VITE_SUPABASE_PROJECT_ID

  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
}

validate_build_env() {
  if [[ -z "${VITE_SUPABASE_URL:-}" ]]; then
    echo "Error: VITE_SUPABASE_URL is required in ${ENV_FILE}." >&2
    exit 1
  fi

  if [[ -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" && -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
    echo "Error: VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is required in ${ENV_FILE}." >&2
    exit 1
  fi

  if [[ ! "${VITE_SUPABASE_URL}" =~ ^https:// ]]; then
    if [[ "${TARGET}" != "test" || ! "${VITE_SUPABASE_URL}" =~ ^/ ]]; then
      echo "Error: deployment bundles must use an HTTPS VITE_SUPABASE_URL. Got: ${VITE_SUPABASE_URL}" >&2
      exit 1
    fi
  fi

  if [[ "${TARGET}" != "test" ]] && [[ "${VITE_SUPABASE_URL}" =~ ^https://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$) ]]; then
    echo "Error: deployment bundles must not target localhost. Got: ${VITE_SUPABASE_URL}" >&2
    exit 1
  fi

  if [[ "${TARGET}" == "production" ]] && [[ "${VITE_SUPABASE_URL}" =~ ^https://(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.) ]]; then
    echo "Error: production bundles must not target private-network API endpoints. Got: ${VITE_SUPABASE_URL}" >&2
    exit 1
  fi
}

cd "${ROOT_DIR}"
load_build_env
validate_build_env

echo "Building ${TARGET} bundle with env file: ${ENV_FILE}"
npx vite build --mode "${MODE}"

VERIFY_ARGS=("${DIST_DIR}")
if [[ "${TARGET}" == "test" ]]; then
  VERIFY_ARGS=(--allow-private-network-endpoints --allow-localhost-endpoints "${DIST_DIR}")
fi

bash "${ROOT_DIR}/scripts/verify-dist-network-endpoints.sh" "${VERIFY_ARGS[@]}"
echo "Bundle build and endpoint verification passed for ${TARGET}."
