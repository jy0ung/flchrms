# FL Group HRMS — Deployment Guide

## Prerequisites

| Requirement | Minimum | Notes |
|---|---|---|
| OS | Ubuntu 22.04 / 24.04 LTS | Debian also supported |
| RAM | 1 GB | 512 MB may work for small teams |
| Disk | 1 GB free | For app + Nginx |
| Network | Open ports 22, 80, 443 | SSH + HTTP/HTTPS |
| Supabase project | Active | [supabase.com](https://supabase.com) |

> The deployment script installs Node.js, Nginx, Certbot, and all other dependencies automatically.

---

## Quick Start

```bash
# 1. SSH into your fresh server
ssh root@your-server-ip

# 2. Clone the repository
git clone https://github.com/jy0ung/flchrms.git /opt/flchrms
cd /opt/flchrms

# 3. Run the deployment script
sudo bash scripts/deploy.sh --domain hrms.example.com --ssl --ssl-email admin@example.com
```

The script will prompt you for your **Supabase credentials** interactively if `.env` doesn't exist yet.

---

## Script Options

```
sudo bash scripts/deploy.sh [OPTIONS]

  --domain <fqdn>       Domain name for Nginx & SSL certificate
  --ssl                 Enable HTTPS via Let's Encrypt (requires --domain)
  --ssl-email <email>   Email for Let's Encrypt notifications
  --branch <branch>     Git branch to deploy (default: main)
  --repo <url>          Git repository URL (if not already cloned)
  --local <path>        Deploy from a local directory instead of cloning
  --skip-build          Skip npm install & build (reuse existing dist/)
  --skip-nginx          Skip Nginx configuration
  --skip-firewall       Skip UFW firewall configuration
  -h, --help            Show help
```

---

## Environment Variables

Copy the template and fill in your Supabase credentials:

```bash
cp .env.example .env
nano .env
```

### Required Variables (Frontend)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

> **Important:** `VITE_*` variables are embedded into the static bundle at build time. If you change them, you must rebuild (`npm run build`) and redeploy.

### Edge Function Secrets (Supabase Dashboard or CLI)

These are set via the Supabase CLI or Dashboard, **not** in the `.env` file:

```bash
supabase secrets set NOTIFICATION_EMAIL_PROVIDER=resend --project-ref <project-id>
supabase secrets set NOTIFICATION_EMAIL_FROM=noreply@yourdomain.com --project-ref <project-id>
supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref <project-id>
```

See `.env.example` for the full list of available edge function variables.

---

## Common Operations

### Update to Latest Version

```bash
cd /opt/flchrms
git pull origin main
sudo bash scripts/deploy.sh --skip-firewall
```

### Rebuild Only (After Changing .env)

```bash
cd /opt/flchrms
sudo bash scripts/deploy.sh --skip-nginx --skip-firewall
```

### Deploy Without SSL (HTTP Only)

```bash
sudo bash scripts/deploy.sh --domain hrms.example.com
```

### Deploy from Local Machine

```bash
# From your local dev machine, rsync to server then deploy
rsync -avz --exclude node_modules --exclude .git ./ root@server:/opt/flchrms/
ssh root@server "cd /opt/flchrms && sudo bash scripts/deploy.sh --local /opt/flchrms --domain hrms.example.com --ssl"
```

---

## Architecture

```
┌─────────────┐     HTTPS      ┌───────────────┐     API      ┌─────────────────┐
│   Browser    │ ◄────────────► │  Nginx        │              │  Supabase Cloud │
│  (SPA)       │                │  /var/www/     │              │  (DB + Auth +   │
│              │                │  flchrms/      │              │   Edge Funcs)   │
└─────────────┘                └───────────────┘              └─────────────────┘
                                static files                   hosted backend
```

- **Frontend**: Vite-built React SPA served as static files by Nginx
- **Backend**: Supabase (cloud-hosted) — no backend server to manage
- **Database**: PostgreSQL managed by Supabase with 52 migrations + RLS policies
- **Edge Functions**: `notification-email-worker` for email notifications

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Build fails with missing env vars | Edit `/opt/flchrms/.env` and ensure all `VITE_*` vars are set |
| Nginx 502 / blank page | Check `dist/` exists: `ls /var/www/flchrms/` |
| SSL cert not renewing | Run `sudo certbot renew --dry-run` to diagnose |
| App loads but API calls fail | Verify `VITE_SUPABASE_URL` is correct and Supabase project is active |
| White screen after deploy | Check browser console — likely a `VITE_SUPABASE_URL` mismatch |

### Logs

```bash
# Nginx access/error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Deployment script can be re-run safely (idempotent)
sudo bash /opt/flchrms/scripts/deploy.sh --skip-firewall
```
