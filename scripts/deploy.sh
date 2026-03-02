#!/usr/bin/env bash
# =============================================================================
#  FL Group HRMS — Automated Production Deployment Script
# =============================================================================
#  Target:  Fresh Ubuntu 22.04 / 24.04 LTS server
#  What it does:
#    1. Installs system packages (Nginx, Certbot, Git, curl, UFW)
#    2. Installs Node.js 20 LTS via NodeSource
#    3. Clones (or updates) the repository
#    4. Copies .env.example → .env if no .env exists and prompts for values
#    5. Installs npm dependencies + builds the Vite SPA
#    6. Deploys the built static files to /var/www/flchrms
#    7. Configures Nginx (HTTP, or HTTPS via Certbot)
#    8. Opens firewall ports (UFW)
#
#  Usage:
#    sudo bash scripts/deploy.sh                 # interactive
#    sudo bash scripts/deploy.sh --domain hrms.example.com --ssl
#    sudo bash scripts/deploy.sh --help
#
#  Re-running this script is safe — it is idempotent.
# =============================================================================
set -euo pipefail

# ── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERR ]${NC}  $*" >&2; }

# ── Defaults ─────────────────────────────────────────────────────────────────
APP_NAME="flchrms"
REPO_URL="https://github.com/jy0ung/flchrms.git"
REPO_BRANCH="main"
DEPLOY_DIR="/opt/${APP_NAME}"
WEB_ROOT="/var/www/${APP_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
NGINX_LINK="/etc/nginx/sites-enabled/${APP_NAME}"
NODE_MAJOR=20
DOMAIN=""
ENABLE_SSL=0
SSL_EMAIL=""
SKIP_BUILD=0
SKIP_NGINX=0
SKIP_FIREWALL=0
LOCAL_SOURCE=""

# ── Parse arguments ──────────────────────────────────────────────────────────
usage() {
  cat <<'EOF'
FL Group HRMS — Deployment Script

Usage:  sudo bash scripts/deploy.sh [OPTIONS]

Options:
  --domain <fqdn>       Domain name for Nginx server_name & SSL cert
  --ssl                 Enable HTTPS via Let's Encrypt (requires --domain)
  --ssl-email <email>   Email for Let's Encrypt notifications
  --branch <branch>     Git branch to deploy (default: main)
  --repo <url>          Git repository URL
  --local <path>        Use a local source directory instead of cloning
  --skip-build          Skip npm install & build (use existing dist/)
  --skip-nginx          Skip Nginx configuration
  --skip-firewall       Skip UFW configuration
  -h, --help            Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)       DOMAIN="$2";       shift 2 ;;
    --ssl)          ENABLE_SSL=1;      shift   ;;
    --ssl-email)    SSL_EMAIL="$2";    shift 2 ;;
    --branch)       REPO_BRANCH="$2";  shift 2 ;;
    --repo)         REPO_URL="$2";     shift 2 ;;
    --local)        LOCAL_SOURCE="$2"; shift 2 ;;
    --skip-build)   SKIP_BUILD=1;      shift   ;;
    --skip-nginx)   SKIP_NGINX=1;      shift   ;;
    --skip-firewall) SKIP_FIREWALL=1;  shift   ;;
    -h|--help)      usage; exit 0 ;;
    *) err "Unknown option: $1"; usage; exit 1 ;;
  esac
done

# ── Pre-flight checks ───────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  err "This script must be run as root (use sudo)."
  exit 1
fi

if [[ $ENABLE_SSL -eq 1 && -z "$DOMAIN" ]]; then
  err "--ssl requires --domain <fqdn>"
  exit 1
fi

# Detect OS
if [[ ! -f /etc/os-release ]]; then
  err "Cannot detect OS. This script supports Ubuntu/Debian."
  exit 1
fi
source /etc/os-release
if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
  warn "Detected $ID — this script is tested on Ubuntu/Debian. Proceeding anyway…"
fi

info "Starting FL Group HRMS deployment…"
echo ""

# =============================================================================
#  STEP 1 — System packages
# =============================================================================
info "Step 1/7 — Installing system packages…"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  curl \
  git \
  wget \
  gnupg \
  ca-certificates \
  lsb-release \
  unzip \
  nginx \
  ufw \
  > /dev/null 2>&1

if [[ $ENABLE_SSL -eq 1 ]]; then
  apt-get install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
fi

ok "System packages installed."

# =============================================================================
#  STEP 2 — Node.js 20 LTS
# =============================================================================
info "Step 2/7 — Installing Node.js ${NODE_MAJOR} LTS…"

if command -v node &>/dev/null; then
  CURRENT_NODE="$(node -v | sed 's/v//' | cut -d. -f1)"
  if [[ "$CURRENT_NODE" -ge "$NODE_MAJOR" ]]; then
    ok "Node.js $(node -v) already installed — skipping."
  else
    warn "Found Node.js v${CURRENT_NODE}, need v${NODE_MAJOR}+. Upgrading…"
    INSTALL_NODE=1
  fi
else
  INSTALL_NODE=1
fi

if [[ "${INSTALL_NODE:-0}" -eq 1 ]]; then
  # NodeSource setup
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
  ok "Node.js $(node -v) installed."
fi

# Verify npm
if ! command -v npm &>/dev/null; then
  err "npm not found after Node.js installation."
  exit 1
fi
ok "npm $(npm -v) available."

# =============================================================================
#  STEP 3 — Application source code
# =============================================================================
info "Step 3/7 — Setting up application source…"

if [[ -n "$LOCAL_SOURCE" ]]; then
  # Use local source directory
  if [[ ! -d "$LOCAL_SOURCE" ]]; then
    err "Local source directory not found: $LOCAL_SOURCE"
    exit 1
  fi
  if [[ "$LOCAL_SOURCE" != "$DEPLOY_DIR" ]]; then
    mkdir -p "$DEPLOY_DIR"
    rsync -a --exclude='node_modules' --exclude='.git' "$LOCAL_SOURCE/" "$DEPLOY_DIR/"
  fi
  ok "Copied local source to ${DEPLOY_DIR}"
elif [[ -d "${DEPLOY_DIR}/.git" ]]; then
  info "Repository exists at ${DEPLOY_DIR} — pulling latest…"
  cd "$DEPLOY_DIR"
  git fetch origin
  git checkout "$REPO_BRANCH"
  git pull origin "$REPO_BRANCH"
  ok "Repository updated."
else
  info "Cloning ${REPO_URL} (branch: ${REPO_BRANCH})…"
  git clone --branch "$REPO_BRANCH" --single-branch "$REPO_URL" "$DEPLOY_DIR"
  ok "Repository cloned to ${DEPLOY_DIR}"
fi

cd "$DEPLOY_DIR"

# =============================================================================
#  STEP 4 — Environment variables
# =============================================================================
info "Step 4/7 — Configuring environment variables…"

if [[ -f .env ]]; then
  ok ".env already exists — skipping. Edit ${DEPLOY_DIR}/.env to change values."
elif [[ -f .env.example ]]; then
  cp .env.example .env
  warn ".env created from .env.example — you MUST edit it before building!"
  warn "  nano ${DEPLOY_DIR}/.env"
  echo ""

  # Interactive prompt if stdin is a terminal
  if [[ -t 0 ]]; then
    read -rp "$(echo -e "${CYAN}Enter VITE_SUPABASE_URL${NC} (or press Enter to skip): ")" val
    [[ -n "$val" ]] && sed -i "s|^VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=${val}|" .env

    read -rp "$(echo -e "${CYAN}Enter VITE_SUPABASE_PUBLISHABLE_KEY${NC} (or press Enter to skip): ")" val
    [[ -n "$val" ]] && sed -i "s|^VITE_SUPABASE_PUBLISHABLE_KEY=.*|VITE_SUPABASE_PUBLISHABLE_KEY=${val}|" .env

    read -rp "$(echo -e "${CYAN}Enter VITE_SUPABASE_PROJECT_ID${NC} (or press Enter to skip): ")" val
    [[ -n "$val" ]] && sed -i "s|^VITE_SUPABASE_PROJECT_ID=.*|VITE_SUPABASE_PROJECT_ID=${val}|" .env

    echo ""
  fi

  # Validate that required vars are set
  MISSING_VARS=0
  while IFS= read -r line; do
    key="${line%%=*}"
    value="${line#*=}"
    if [[ "$key" =~ ^VITE_ && -z "$value" ]]; then
      warn "  ⚠  ${key} is empty in .env"
      MISSING_VARS=1
    fi
  done < .env

  if [[ $MISSING_VARS -eq 1 ]]; then
    warn "Some VITE_* variables are empty. The build will proceed but the app may not work correctly."
    warn "Edit ${DEPLOY_DIR}/.env and re-run with --skip-nginx --skip-firewall to rebuild only."
  fi
else
  warn "No .env.example found — creating minimal .env template…"
  cat > .env <<'ENVEOF'
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
ENVEOF
  warn "Edit ${DEPLOY_DIR}/.env with your Supabase credentials, then re-run the script."
fi

# =============================================================================
#  STEP 5 — Build the application
# =============================================================================
if [[ $SKIP_BUILD -eq 0 ]]; then
  info "Step 5/7 — Installing dependencies & building…"

  # Install production + dev dependencies (dev is needed for vite build)
  npm ci --no-audit --no-fund 2>&1 | tail -1
  ok "npm dependencies installed."

  # Source .env so VITE_* vars are available to the build
  set -a
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  set +a

  info "Running vite build…"
  npx vite build 2>&1 | tail -5
  ok "Application built successfully."
else
  info "Step 5/7 — Skipped (--skip-build)."
fi

# Verify dist/ exists
if [[ ! -d "${DEPLOY_DIR}/dist" ]]; then
  err "dist/ directory not found. Build may have failed."
  exit 1
fi

# =============================================================================
#  STEP 6 — Deploy to web root + configure Nginx
# =============================================================================
if [[ $SKIP_NGINX -eq 0 ]]; then
  info "Step 6/7 — Deploying to ${WEB_ROOT} & configuring Nginx…"

  # Copy built files
  mkdir -p "$WEB_ROOT"
  rsync -a --delete "${DEPLOY_DIR}/dist/" "${WEB_ROOT}/"
  chown -R www-data:www-data "$WEB_ROOT"
  ok "Static files deployed to ${WEB_ROOT}"

  # Determine server_name
  SERVER_NAME="${DOMAIN:-_}"

  # Write Nginx config
  cat > "$NGINX_CONF" <<NGINXEOF
# FL Group HRMS — auto-generated by deploy.sh
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    root ${WEB_ROOT};
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml
        font/woff2;

    # Cache static assets aggressively (Vite hashed filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        return 404;
    }
}
NGINXEOF

  # Enable site
  ln -sf "$NGINX_CONF" "$NGINX_LINK"

  # Remove default site if it exists and we have a proper config
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  # Test & reload Nginx
  nginx -t 2>&1
  systemctl enable nginx
  systemctl reload nginx
  ok "Nginx configured and reloaded."

  # ── SSL via Certbot ──────────────────────────────────────────────────────
  if [[ $ENABLE_SSL -eq 1 ]]; then
    info "Obtaining SSL certificate for ${DOMAIN}…"
    CERTBOT_ARGS=(
      --nginx
      -d "$DOMAIN"
      --non-interactive
      --agree-tos
      --redirect
    )
    if [[ -n "$SSL_EMAIL" ]]; then
      CERTBOT_ARGS+=(--email "$SSL_EMAIL")
    else
      CERTBOT_ARGS+=(--register-unsafely-without-email)
    fi

    certbot "${CERTBOT_ARGS[@]}"
    ok "SSL certificate installed. Auto-renewal is enabled by default."

    # Verify auto-renewal timer
    if systemctl is-active --quiet certbot.timer 2>/dev/null; then
      ok "Certbot auto-renewal timer is active."
    else
      warn "Certbot timer not detected — set up a cron job:"
      warn '  echo "0 3 * * * certbot renew --quiet" | crontab -'
    fi
  fi
else
  info "Step 6/7 — Skipped (--skip-nginx)."
fi

# =============================================================================
#  STEP 7 — Firewall (UFW)
# =============================================================================
if [[ $SKIP_FIREWALL -eq 0 ]]; then
  info "Step 7/7 — Configuring firewall…"

  ufw --force enable > /dev/null 2>&1 || true
  ufw allow OpenSSH   > /dev/null 2>&1
  ufw allow 'Nginx Full' > /dev/null 2>&1
  ufw --force reload  > /dev/null 2>&1
  ok "UFW enabled — SSH and Nginx (HTTP+HTTPS) allowed."
else
  info "Step 7/7 — Skipped (--skip-firewall)."
fi

# =============================================================================
#  Done!
# =============================================================================
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  FL Group HRMS deployed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
if [[ -n "$DOMAIN" ]]; then
  if [[ $ENABLE_SSL -eq 1 ]]; then
    echo -e "  URL:      ${CYAN}https://${DOMAIN}${NC}"
  else
    echo -e "  URL:      ${CYAN}http://${DOMAIN}${NC}"
  fi
else
  echo -e "  URL:      ${CYAN}http://<server-ip>${NC}"
fi
echo -e "  Web root: ${WEB_ROOT}"
echo -e "  Source:   ${DEPLOY_DIR}"
echo -e "  Env file: ${DEPLOY_DIR}/.env"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
if grep -q '^VITE_SUPABASE_URL=$' "${DEPLOY_DIR}/.env" 2>/dev/null; then
  echo -e "  1. Edit ${DEPLOY_DIR}/.env with your Supabase credentials"
  echo -e "  2. Re-run: sudo bash ${DEPLOY_DIR}/scripts/deploy.sh --skip-nginx --skip-firewall"
else
  echo -e "  • To update:  cd ${DEPLOY_DIR} && git pull && sudo bash scripts/deploy.sh --skip-firewall"
  echo -e "  • To rebuild: sudo bash ${DEPLOY_DIR}/scripts/deploy.sh --skip-nginx --skip-firewall"
fi
echo ""
echo -e "  ${YELLOW}Supabase Edge Functions:${NC}"
echo -e "  Set secrets via: supabase secrets set KEY=value --project-ref <project-id>"
echo -e "  See .env.example for the full list of edge function variables."
echo ""
