#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${1:-${ROOT_DIR}/dist}"

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

forbidden_patterns=(
  "https?://192\\.168\\.[0-9]{1,3}\\.[0-9]{1,3}/api"
  "https?://10\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}/api"
  "https?://172\\.(1[6-9]|2[0-9]|3[01])\\.[0-9]{1,3}\\.[0-9]{1,3}/api"
  "https?://127\\.0\\.0\\.1(:[0-9]+)?/api"
  "https?://localhost(:[0-9]+)?/api"
)

for pattern in "${forbidden_patterns[@]}"; do
  if "${SCAN_TOOL}" "${SCAN_ARGS[@]}" "${pattern}" "${DIST_DIR}"; then
    echo
    echo "Build verification failed: forbidden endpoint pattern matched (${pattern})."
    echo "Use HTTPS public endpoints for production builds."
    exit 1
  fi
done

echo "Dist endpoint verification passed."
