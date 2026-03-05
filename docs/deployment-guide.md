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
>
> **Critical safety check:** production builds must pass endpoint verification so private/local API URLs are never embedded in deployed JS bundles.

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

### Manual Production Build + Deploy (with endpoint verification)

```bash
cd /opt/flchrms
export VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
npm run build

# optional local preflight (already run by npm run build)
bash scripts/verify-dist-network-endpoints.sh dist

sudo rsync -a --delete dist/ /var/www/flchrms/

# post-deploy verification on deployed web root
sudo bash scripts/verify-dist-network-endpoints.sh /var/www/flchrms
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

## First-Time Setup — Admin Bootstrap

On a **fresh deployment with zero users**, the first person to sign up is automatically promoted to the **admin** role. All subsequent signups receive the default `employee` role.

### How it works

The `handle_new_user()` database trigger checks whether the signing-up user is the only user in the system (`SELECT count(*) FROM auth.users WHERE deleted_at IS NULL`). If count = 1, the user is assigned the `admin` role instead of `employee`.

### Recommended procedure

1. Complete the deployment steps above (Supabase project + frontend deploy).
2. Navigate to the app and **sign up** with the intended administrator's email and a strong password.
3. Verify admin access: after signing in, the **Admin** page should be accessible in the sidebar.
4. Use the Admin panel to create additional users or let employees self-register (they will receive the `employee` role).

### Security notes

- The promotion logic is **inherently one-shot** — once any user exists, all future signups get `employee`.
- There is no hardcoded password, no bootstrap script to run, and no service role key exposed.
- If you need to demote or reassign the first admin, update `user_roles` directly in the Supabase SQL editor.

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
