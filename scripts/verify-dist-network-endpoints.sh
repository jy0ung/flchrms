#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
ALLOW_PRIVATE_NETWORKS=0
ALLOW_LOCALHOST=0

usage() {
  cat <<'EOF'
Usage: bash scripts/verify-dist-network-endpoints.sh [OPTIONS] [dist-dir]

Options:
  --allow-private-network-endpoints   Allow RFC1918/private IP API endpoints.
                                      Localhost endpoints remain forbidden.
  --allow-localhost-endpoints         Allow localhost/127.0.0.1 API endpoints.
  -h, --help                          Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-private-network-endpoints)
      ALLOW_PRIVATE_NETWORKS=1
      shift
      ;;
    --allow-localhost-endpoints)
      ALLOW_LOCALHOST=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      DIST_DIR="$1"
      shift
      ;;
  esac
done

if [[ ! -d "${DIST_DIR}" ]]; then
  echo "Error: dist directory not found: ${DIST_DIR}"
  exit 2
fi

echo "Verifying built assets do not contain private/local API endpoints..."

SCAN_TOOL=""
SCAN_ARGS=()
if command -v rg >/dev/null 2>&1; then
  SCAN_TOOL="rg"
  SCAN_ARGS=(-n)
elif command -v grep >/dev/null 2>&1; then
  SCAN_TOOL="grep"
  SCAN_ARGS=(-R -n -E)
else
  echo "Error: neither ripgrep (rg) nor grep is available for endpoint verification."
  exit 2
fi

forbidden_patterns=()

if [[ "${ALLOW_LOCALHOST}" -ne 1 ]]; then
  forbidden_patterns+=(
    "https?://127\\.0\\.0\\.1(:[0-9]+)?/api"
    "https?://localhost(:[0-9]+)?/api"
  )
fi

if [[ "${ALLOW_PRIVATE_NETWORKS}" -ne 1 ]]; then
  forbidden_patterns+=(
    "https?://192\\.168\\.[0-9]{1,3}\\.[0-9]{1,3}/api"
    "https?://10\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}/api"
    "https?://172\\.(1[6-9]|2[0-9]|3[01])\\.[0-9]{1,3}\\.[0-9]{1,3}/api"
  )
fi

for pattern in "${forbidden_patterns[@]}"; do
  if "${SCAN_TOOL}" "${SCAN_ARGS[@]}" "${pattern}" "${DIST_DIR}"; then
    echo
    echo "Build verification failed: forbidden endpoint pattern matched (${pattern})."
    echo "Use HTTPS public endpoints for production builds."
    exit 1
  fi
done

echo "Dist endpoint verification passed."
