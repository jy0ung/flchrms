#!/usr/bin/env bash
# =============================================================================
# flchrms Update Script
# =============================================================================
# Pulls latest code from GitHub, rebuilds, and reloads Nginx.
# Installed to /usr/local/bin/flchrms-update by setup-vps.sh
#
# Usage:
#   sudo flchrms-update              # Normal update (pull + build + reload)
#   sudo flchrms-update --rollback   # Revert to previous build
#   sudo flchrms-update --status     # Show current deployment info
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/flchrms"
DIST_DIR="${APP_DIR}/dist"
BACKUP_DIR="${APP_DIR}/dist.backup"
DEPLOY_USER="www-data"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }

# ---------------------------------------------------------------------------
# --status
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--status" ]]; then
    echo ""
    echo "flchrms deployment status"
    echo "========================="
    cd "$APP_DIR"
    echo " Branch:     $(git rev-parse --abbrev-ref HEAD)"
    echo " Commit:     $(git log -1 --format='%h %s' 2>/dev/null)"
    echo " Built:      $(stat -c '%y' "${DIST_DIR}/index.html" 2>/dev/null || echo 'not found')"
    echo " Nginx:      $(systemctl is-active nginx)"
    echo " Disk used:  $(du -sh "$DIST_DIR" 2>/dev/null | cut -f1)"
    if [[ -d "$BACKUP_DIR" ]]; then
        echo " Backup:     $(stat -c '%y' "${BACKUP_DIR}/index.html" 2>/dev/null || echo 'present')"
    else
        echo " Backup:     none"
    fi
    echo ""
    exit 0
fi

# ---------------------------------------------------------------------------
# --rollback
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--rollback" ]]; then
    echo ""
    echo -e "${YELLOW}Rolling back to previous build...${NC}"
    if [[ ! -d "$BACKUP_DIR" ]]; then
        fail "No backup found at ${BACKUP_DIR}"
        exit 1
    fi
    rm -rf "$DIST_DIR"
    mv "$BACKUP_DIR" "$DIST_DIR"
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$DIST_DIR"
    systemctl reload nginx
    ok "Rolled back successfully"
    info "Current build: $(stat -c '%y' "${DIST_DIR}/index.html")"
    echo ""
    exit 0
fi

# ---------------------------------------------------------------------------
# Normal update
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}flchrms update${NC}"
echo "=============="

cd "$APP_DIR"

# 1. Pull latest
info "Pulling latest from $(git remote get-url origin)..."
PREV_COMMIT=$(git rev-parse HEAD)
git fetch origin
git reset --hard "origin/$(git rev-parse --abbrev-ref HEAD)"
git clean -fd
NEW_COMMIT=$(git rev-parse HEAD)

if [[ "$PREV_COMMIT" == "$NEW_COMMIT" ]]; then
    warn "Already up to date (${NEW_COMMIT:0:7})"
    echo ""

    read -rp "  Rebuild anyway? [y/N] " REBUILD
    if [[ ! "$REBUILD" =~ ^[Yy]$ ]]; then
        echo "  Aborted."
        exit 0
    fi
else
    ok "Updated: ${PREV_COMMIT:0:7} → ${NEW_COMMIT:0:7}"
    # Show changed files
    echo ""
    git --no-pager diff --stat "${PREV_COMMIT}..${NEW_COMMIT}" | head -20
    echo ""
fi

# 2. Install dependencies
info "Installing dependencies..."
npm ci --ignore-scripts=false 2>&1 | tail -1
ok "Dependencies installed"

# 3. Backup current dist
if [[ -d "$DIST_DIR" ]]; then
    rm -rf "$BACKUP_DIR"
    cp -a "$DIST_DIR" "$BACKUP_DIR"
    ok "Previous build backed up to ${BACKUP_DIR}"
fi

# 4. Build
info "Building for production..."
if npx vite build --mode production 2>&1 | tail -5; then
    ok "Build complete"
else
    fail "Build failed!"
    if [[ -d "$BACKUP_DIR" ]]; then
        warn "Restoring previous build from backup..."
        rm -rf "$DIST_DIR"
        mv "$BACKUP_DIR" "$DIST_DIR"
        ok "Previous build restored"
    fi
    exit 1
fi

# 5. Set ownership
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$APP_DIR"

# 6. Reload Nginx
info "Reloading Nginx..."
if nginx -t 2>&1; then
    systemctl reload nginx
    ok "Nginx reloaded"
else
    fail "Nginx config test failed — not reloading"
    exit 1
fi

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo " Commit: $(git log -1 --format='%h %s')"
echo " Built:  $(date)"
echo ""
echo " To rollback: sudo flchrms-update --rollback"
echo ""
