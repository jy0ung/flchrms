#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="test"
ENV_FILE=""
WEB_ROOT=""
MODE="production"
DEPLOY_USER="${DEPLOY_USER:-www-data}"

usage() {
  cat <<'EOF'
Usage: bash scripts/deploy-static-webroot.sh --env-file <path> --web-root <path> [OPTIONS]

Options:
  --env-file <path>     Explicit env file used for the bundle build.
  --web-root <path>     Destination web root for the built static bundle.
  --target <target>     Deploy target: production | test (default: test)
  --mode <mode>         Vite mode to build (default: production)
  --deploy-user <user>  Ownership user for deployed files (default: www-data)
  -h, --help            Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --web-root)
      WEB_ROOT="$2"
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
    --deploy-user)
      DEPLOY_USER="$2"
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

if [[ -z "${ENV_FILE}" || -z "${WEB_ROOT}" ]]; then
  echo "Error: --env-file and --web-root are required." >&2
  usage >&2
  exit 1
fi

cd "${ROOT_DIR}"
bash "${ROOT_DIR}/scripts/build-static-bundle.sh" \
  --env-file "${ENV_FILE}" \
  --target "${TARGET}" \
  --mode "${MODE}" \
  --dist-dir "${ROOT_DIR}/dist"

mkdir -p "${WEB_ROOT}"
rsync -a --delete "${ROOT_DIR}/dist/" "${WEB_ROOT}/"

if [[ "${EUID:-$(id -u)}" -eq 0 ]] && id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${WEB_ROOT}"
fi

VERIFY_ARGS=("${WEB_ROOT}")
if [[ "${TARGET}" == "test" ]]; then
  VERIFY_ARGS=(--allow-private-network-endpoints --allow-localhost-endpoints "${WEB_ROOT}")
fi

bash "${ROOT_DIR}/scripts/verify-dist-network-endpoints.sh" "${VERIFY_ARGS[@]}"
echo "Static bundle deployed to ${WEB_ROOT} for ${TARGET}."
