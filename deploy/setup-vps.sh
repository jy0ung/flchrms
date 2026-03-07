#!/usr/bin/env bash
# =============================================================================
# flchrms VPS Setup Script — Ubuntu Server 24.04
# =============================================================================
# Installs: Node.js 20, Nginx, Certbot (SSL), Supabase CLI
# Deploys:  React SPA from GitHub, served via Nginx with HTTPS
# Backend:  Supabase Cloud (no Docker on this server)
#
# Usage:
#   1. Edit deploy/.env.deploy with your values
#   2. SCP both files to the VPS:
#        scp deploy/setup-vps.sh deploy/.env.deploy user@your-vps:~/
#   3. SSH in and run:
#        sudo bash setup-vps.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Load configuration
# ---------------------------------------------------------------------------
ENV_FILE="${SCRIPT_DIR}/.env.deploy"
if [[ ! -f "$ENV_FILE" ]]; then
    echo "============================================================"
    echo " ERROR: ${ENV_FILE} not found."
    echo " Copy deploy/.env.deploy.example → deploy/.env.deploy"
    echo " and fill in your values before running this script."
    echo "============================================================"
    exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# ---------------------------------------------------------------------------
# Validate required variables
# ---------------------------------------------------------------------------
REQUIRED_VARS=(
    DEPLOY_DOMAIN
    DEPLOY_CERTBOT_EMAIL
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY
)

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        MISSING+=("$var")
    fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo "============================================================"
    echo " ERROR: Missing required variables in .env.deploy:"
    printf '   - %s\n' "${MISSING[@]}"
    echo "============================================================"
    exit 1
fi

# Defaults
DEPLOY_GITHUB_REPO="${DEPLOY_GITHUB_REPO:-https://github.com/jy0ung/flchrms.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_APP_DIR="${DEPLOY_APP_DIR:-/var/www/flchrms}"
DEPLOY_DIST_DIR="${DEPLOY_APP_DIR}/dist"
DEPLOY_USER="${DEPLOY_USER:-www-data}"
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
NOTIFICATION_EMAIL_FROM="${NOTIFICATION_EMAIL_FROM:-noreply@${DEPLOY_DOMAIN}}"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

step() {
    echo -e "\n${CYAN}[$1]${NC} $2"
}

ok() {
    echo -e "  ${GREEN}✓${NC} $1"
}

warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

fail() {
    echo -e "  ${RED}✗${NC} $1"
}

TOTAL_STEPS=9

echo ""
echo "==========================================="
echo " flchrms VPS Setup — Ubuntu 24.04"
echo "==========================================="
echo " Domain:     ${DEPLOY_DOMAIN}"
echo " Repository: ${DEPLOY_GITHUB_REPO}"
echo " Branch:     ${DEPLOY_BRANCH}"
echo " App dir:    ${DEPLOY_APP_DIR}"
echo "==========================================="
echo ""

# ---------------------------------------------------------------------------
# Step 1: System updates & essentials
# ---------------------------------------------------------------------------
step "1/${TOTAL_STEPS}" "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl \
    git \
    unzip \
    build-essential \
    software-properties-common \
    ca-certificates \
    gnupg \
    ufw \
    logrotate \
    htop
ok "System packages updated"

# ---------------------------------------------------------------------------
# Step 2: Firewall (UFW)
# ---------------------------------------------------------------------------
step "2/${TOTAL_STEPS}" "Configuring firewall (UFW)..."
ufw allow OpenSSH          >/dev/null 2>&1
ufw allow 'Nginx Full'     >/dev/null 2>&1
ufw --force enable          >/dev/null 2>&1
ok "Firewall active — SSH + HTTP/HTTPS allowed"

# ---------------------------------------------------------------------------
# Step 3: Node.js 20
# ---------------------------------------------------------------------------
step "3/${TOTAL_STEPS}" "Installing Node.js 20..."
if command -v node &>/dev/null && [[ "$(node -v)" == v20* ]]; then
    ok "Node.js $(node -v) already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs
    ok "Node.js $(node -v) installed"
fi
ok "npm $(npm -v)"

# ---------------------------------------------------------------------------
# Step 4: Supabase CLI
# ---------------------------------------------------------------------------
step "4/${TOTAL_STEPS}" "Installing Supabase CLI..."
if command -v supabase &>/dev/null; then
    ok "Supabase CLI already installed: $(supabase --version)"
else
    curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | bash >/dev/null 2>&1
    ok "Supabase CLI installed: $(supabase --version)"
fi

# ---------------------------------------------------------------------------
# Step 5: Clone repository & build
# ---------------------------------------------------------------------------
step "5/${TOTAL_STEPS}" "Cloning repository and building..."
if [[ -d "${DEPLOY_APP_DIR}/.git" ]]; then
    warn "Directory ${DEPLOY_APP_DIR} exists — pulling latest..."
    cd "$DEPLOY_APP_DIR"
    git fetch origin
    git reset --hard "origin/${DEPLOY_BRANCH}"
    git clean -fd
else
    git clone --branch "$DEPLOY_BRANCH" "$DEPLOY_GITHUB_REPO" "$DEPLOY_APP_DIR"
    cd "$DEPLOY_APP_DIR"
fi
ok "Source code ready at ${DEPLOY_APP_DIR}"

# Write production .env (build-time variables)
cat > "${DEPLOY_APP_DIR}/.env.production" <<ENVEOF
VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENVEOF
ok ".env.production written"

echo "  Installing npm dependencies..."
npm ci --ignore-scripts=false 2>&1 | tail -1
ok "Dependencies installed"

echo "  Building for production..."
bash "${DEPLOY_APP_DIR}/scripts/build-static-bundle.sh" \
    --env-file "${DEPLOY_APP_DIR}/.env.production" \
    --target production \
    --mode production \
    --dist-dir "${DEPLOY_DIST_DIR}" 2>&1 | tail -3
ok "Build complete → ${DEPLOY_DIST_DIR}"

# Set ownership
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$DEPLOY_APP_DIR"

# ---------------------------------------------------------------------------
# Step 6: Database migrations (Supabase Cloud)
# ---------------------------------------------------------------------------
step "6/${TOTAL_STEPS}" "Database migrations..."
if [[ -n "$SUPABASE_ACCESS_TOKEN" && -n "$SUPABASE_DB_PASSWORD" && -n "$SUPABASE_PROJECT_ID" ]]; then
    cd "$DEPLOY_APP_DIR"
    export SUPABASE_ACCESS_TOKEN
    supabase link --project-ref "$SUPABASE_PROJECT_ID" --password "$SUPABASE_DB_PASSWORD" 2>&1 | tail -1
    supabase db push --linked 2>&1 | tail -3
    ok "Migrations pushed to Supabase Cloud"
else
    warn "SKIPPED — set SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD,"
    warn "and SUPABASE_PROJECT_ID in .env.deploy to enable."
    warn "Run manually: cd ${DEPLOY_APP_DIR} && supabase link && supabase db push"
fi

# ---------------------------------------------------------------------------
# Step 7: Edge function secrets + deploy (Resend)
# ---------------------------------------------------------------------------
step "7/${TOTAL_STEPS}" "Edge function configuration..."
if [[ -n "$SUPABASE_ACCESS_TOKEN" && -n "$SUPABASE_PROJECT_ID" ]]; then
    cd "$DEPLOY_APP_DIR"
    export SUPABASE_ACCESS_TOKEN

    if [[ -n "$RESEND_API_KEY" ]]; then
        supabase secrets set \
            RESEND_API_KEY="$RESEND_API_KEY" \
            NOTIFICATION_EMAIL_PROVIDER="resend" \
            NOTIFICATION_EMAIL_FROM="$NOTIFICATION_EMAIL_FROM" \
            --project-ref "$SUPABASE_PROJECT_ID" 2>&1 | tail -1
        ok "Resend secrets configured"
    else
        warn "RESEND_API_KEY not set — email worker will use stub mode"
    fi

    supabase functions deploy notification-email-worker \
        --project-ref "$SUPABASE_PROJECT_ID" 2>&1 | tail -1
    ok "Edge function 'notification-email-worker' deployed"
else
    warn "SKIPPED — set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID"
    warn "in .env.deploy to deploy edge functions."
fi

# ---------------------------------------------------------------------------
# Step 8: Nginx
# ---------------------------------------------------------------------------
step "8/${TOTAL_STEPS}" "Configuring Nginx..."
apt-get install -y -qq nginx

cat > /etc/nginx/sites-available/flchrms <<NGINXEOF
# flchrms — Vite React SPA
# Generated by deploy/setup-vps.sh

server {
    listen 80;
    listen [::]:80;
    server_name ${DEPLOY_DOMAIN};

    root ${DEPLOY_DIST_DIR};
    index index.html;

    # ── index.html — never cache so deploys take effect immediately
    # ── SPA fallback ─────────────────────────────────────────────
    location / {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        try_files \$uri \$uri/ /index.html;
    }

    # ── Static assets — long cache ───────────────────────────────
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ── Other static files ───────────────────────────────────────
    location ~* \.(ico|svg|woff2?|ttf|eot|webp|png|jpg|jpeg|gif|map)$ {
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # ── Security headers ─────────────────────────────────────────
    add_header X-Frame-Options         "SAMEORIGIN"                          always;
    add_header X-Content-Type-Options  "nosniff"                             always;
    add_header Referrer-Policy         "strict-origin-when-cross-origin"     always;
    add_header X-XSS-Protection        "1; mode=block"                      always;
    add_header Permissions-Policy      "camera=(), microphone=(), geolocation=()" always;

    # ── Gzip ─────────────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/rss+xml
        image/svg+xml
        font/woff2;

    # ── Logs ─────────────────────────────────────────────────────
    access_log /var/log/nginx/flchrms.access.log;
    error_log  /var/log/nginx/flchrms.error.log;
}
NGINXEOF

# Enable site, disable default
ln -sf /etc/nginx/sites-available/flchrms /etc/nginx/sites-enabled/flchrms
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
systemctl enable nginx
ok "Nginx configured and running"

# ---------------------------------------------------------------------------
# Step 9: SSL (Let's Encrypt via Certbot)
# ---------------------------------------------------------------------------
step "9/${TOTAL_STEPS}" "Setting up SSL with Let's Encrypt..."
apt-get install -y -qq certbot python3-certbot-nginx

certbot --nginx \
    -d "$DEPLOY_DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$DEPLOY_CERTBOT_EMAIL" \
    --redirect

# Verify auto-renewal timer
systemctl is-active --quiet certbot.timer && ok "Certbot auto-renewal timer active" || warn "Enable certbot timer: systemctl enable --now certbot.timer"
ok "SSL certificate installed for ${DEPLOY_DOMAIN}"

# ---------------------------------------------------------------------------
# Install convenience scripts
# ---------------------------------------------------------------------------
install -m 755 "${DEPLOY_APP_DIR}/deploy/flchrms-update.sh" /usr/local/bin/flchrms-update 2>/dev/null || true

# ---------------------------------------------------------------------------
# Log rotation for Nginx logs
# ---------------------------------------------------------------------------
cat > /etc/logrotate.d/flchrms <<'LOGEOF'
/var/log/nginx/flchrms.*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
LOGEOF
ok "Log rotation configured (14-day retention)"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}==========================================="
echo " SETUP COMPLETE"
echo "===========================================${NC}"
echo ""
echo " Site URL:       https://${DEPLOY_DOMAIN}"
echo " App directory:  ${DEPLOY_APP_DIR}"
echo " Nginx config:   /etc/nginx/sites-available/flchrms"
echo " SSL:            Let's Encrypt (auto-renew)"
echo " Logs:           /var/log/nginx/flchrms.*.log"
echo ""
echo " Quick commands:"
echo "   sudo flchrms-update             # Pull, rebuild, reload"
echo "   sudo systemctl status nginx     # Nginx status"
echo "   sudo certbot renew --dry-run    # Test SSL renewal"
echo "   sudo tail -f /var/log/nginx/flchrms.error.log"
echo ""
echo "==========================================="
