# Login Hotfix Status — AUDIT_2026-03-04

## Root cause
Production frontend bundle still references a private API base URL (`http://192.168.1.133/api`), so username login resolution fails from browser clients even when credentials are valid.

## What was completed
- Guardrail in deploy script updated to run `npm run build` (which includes dist endpoint verification).
- Deploy script now performs post-deploy endpoint verification on deployed web root.
- Deployment docs updated with endpoint verification steps.
- Reusable prompt build/deploy block updated to use `npm run build` and post-deploy verification.
- Fresh local production build completed with explicit Supabase env (`VITE_SUPABASE_URL=https://bmdmdppcbdklfbwksvtu.supabase.co`).
- Local built assets pass endpoint verification (no private/local API URL patterns).
- Production deploy completed to `/var/www/flchrms` with rollback snapshot at `/var/www/flchrms-backup-20260304T233356Z`.
- Post-deploy endpoint verification passed on `/var/www/flchrms`.
- Nginx configuration test passed and Nginx was reloaded successfully.
- Live production bundle now serves `assets/index-ensLYeur.js`, contains the Supabase URL, and contains no forbidden private `/api` endpoint pattern.
- Auth sanity checks pass directly against Supabase:
  - `jamri.saidi` resolves to `flit092023@gmail.com`.
  - Correct password authenticates.
  - Wrong password fails with invalid credentials.

## Evidence
- `output/audit/AUDIT_2026-03-04/logs/pre-deploy-scan.log`
- `output/audit/AUDIT_2026-03-04/logs/pre-deploy-live-bundle.log`
- `output/audit/AUDIT_2026-03-04/logs/build-hotfix.log`
- `output/audit/AUDIT_2026-03-04/logs/build-hotfix-rerun.log`
- `output/audit/AUDIT_2026-03-04/logs/post-build-local-dist-check.log`
- `output/audit/AUDIT_2026-03-04/logs/deploy-hotfix-rerun.log`
- `output/audit/AUDIT_2026-03-04/logs/post-deploy-webroot-scan.log`
- `output/audit/AUDIT_2026-03-04/logs/post-deploy-webroot-forbidden-patterns.log`
- `output/audit/AUDIT_2026-03-04/logs/post-deploy-live-bundle-check-concise.log`
- `output/audit/AUDIT_2026-03-04/logs/auth-sanity-check.log`
- `output/audit/AUDIT_2026-03-04/logs/post-deploy-browser-login-check.log` (browser automation attempt failed in this shell due missing ALSA symbol dependency in Playwright Chromium runtime)

## Post-deploy status
- Hotfix is live on `https://e-leave.protonfookloi.com` as of 2026-03-04 UTC.
- Deployment guardrails are in place to prevent recurrence during future deploys.
