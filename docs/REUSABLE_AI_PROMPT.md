# FLC-HRMS — Reusable AI Session Prompt

> **Copy-paste this prompt at the start of any new AI coding session** to provide full context about the FLCHRMS codebase. Append your specific task/question after the separator at the bottom.

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| Name | FLC-HRMS (FL Group HR Management System) |
| URL | `https://e-leave.protonfookloi.com` |
| Repo path | `/home/hrms_admin/projects/flchrms` |
| Web root | `/var/www/flchrms/` |
| Server | Ubuntu 24.04 LTS @ `192.168.1.240`, Nginx, Cloudflare tunnel |

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript 5.8, Vite 5 (SWC) |
| State | TanStack React Query v5 (staleTime 60s, gcTime 5min) |
| Styling | Tailwind CSS 3 + shadcn/ui + Radix UI primitives |
| Backend | Supabase (PostgreSQL 15+, PostgREST, Auth, Storage, Edge Functions) |
| Auth | Supabase Auth with email/password |
| Routing | react-router-dom v6 (lazy loaded pages) |
| Testing | Vitest + @testing-library/react (unit), Playwright (e2e) |

## 3. Supabase Connection

```
Project ref:  bmdmdppcbdklfbwksvtu
URL:          https://bmdmdppcbdklfbwksvtu.supabase.co
Anon key:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZG1kcHBjYmRrbGZid2tzdnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjk1NzYsImV4cCI6MjA4NzkwNTU3Nn0.Q8WG37liQZHCa_XnAW_sfYqRX1E3c0bbud-dco833j0
Access token: sbp_9cee85eead30cb8011b5b43dd31fc0772bf8c19b
```

**SQL execution** (supabase CLI `db push` may fail — use Management API):
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/bmdmdppcbdklfbwksvtu/database/query" \
  -H "Authorization: Bearer sbp_9cee85eead30cb8011b5b43dd31fc0772bf8c19b" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR SQL HERE"}'
```

**Type generation** (after schema changes):
```bash
npx supabase gen types typescript \
  --project-id bmdmdppcbdklfbwksvtu \
  > src/integrations/supabase/types.ts
```

## 4. Build & Deploy

```bash
# Build
cd /home/hrms_admin/projects/flchrms
VITE_SUPABASE_URL="https://bmdmdppcbdklfbwksvtu.supabase.co" \
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZG1kcHBjYmRrbGZid2tzdnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjk1NzYsImV4cCI6MjA4NzkwNTU3Nn0.Q8WG37liQZHCa_XnAW_sfYqRX1E3c0bbud-dco833j0" \
npx vite build

# Deploy
sudo rm -rf /var/www/flchrms/* && sudo cp -r dist/* /var/www/flchrms/
```

## 5. RBAC Model

6 roles with hierarchical permissions:

| Role | Access |
|------|--------|
| `employee` | Own data only |
| `manager` | Own + direct reports |
| `general_manager` | Own + org-wide visibility |
| `director` | Full system access (non-admin) |
| `hr` | Employee management, leave policies, payroll |
| `admin` | Full system access + admin panel |

Role enforcement: RLS policies (Supabase) + frontend route guards + permission helper functions in `src/lib/permissions.ts`.

**Test credentials** (all use password `Test1234!`):
- `admin@flchrms.test`, `hr@flchrms.test`, `manager@flchrms.test`, `employee@flchrms.test`, `gm@flchrms.test`, `director@flchrms.test`

## 6. Architecture Patterns

### Provider tree (App.tsx)
```
QueryClientProvider → BrandingProvider → ThemeProvider → TooltipProvider
  → BrowserRouter → AuthProvider → RouteErrorBoundary → Suspense → Routes
```

### Page structure
```
AppPageContainer
  └── PageHeader (title, description, actions, toolbarSlot)
  └── Content (DataTableShell, Cards, Tabs, etc.)
```

### Component layers
1. **Radix UI** primitives (Button, Dialog, Popover, etc. via shadcn/ui)
2. **System components** (`src/components/system/` — StatusBadge, PageHeader, DataTableShell, ModalScaffold, SectionToolbar, etc.)
3. **Feature components** (`src/components/leave/`, `employees/`, `admin/`, etc.)
4. **Pages** (`src/pages/` — lazy-loaded, <200 lines each ideally)

### Data flow
```
Hook (useQuery) → Supabase client → PostgREST/RPC → PostgreSQL (with RLS)
Mutation (useMutation) → Supabase → invalidateQueries → auto-refetch
```

### State management
- **Server state**: TanStack Query (no Redux/Zustand)
- **UI state**: React useState/useReducer, kept in pages or extracted to `useXxxViewModel` hooks
- **Global state**: AuthContext (user/role/session), BrandingContext (CSS vars, document title, favicon)

### Styling conventions
- HSL CSS custom properties in `src/index.css` (light/dark themes)
- BrandingProvider injects overrides at runtime via `document.documentElement.style.setProperty`
- Tailwind utility classes + `cn()` helper (clsx + tailwind-merge)
- System components use consistent density (compact/default/comfortable)
- No `!important`, no inline styles except dynamic branding color injection

## 7. Key Directories

```
src/
  App.tsx              # Routes and providers
  index.css            # CSS custom properties (design tokens)
  components/
    system/            # 19 design-system primitives (NEVER modify without tests)
    ui/                # shadcn/ui components (auto-generated — edit cautiously)
    leave/             # Leave management components
    employees/         # Employee management components
    admin/             # Admin panel components
    auth/              # Login/auth components
    layout/            # AppSidebar, AppLayout, AdminLayout
    dashboard/         # Dashboard widgets
  contexts/
    AuthContext.tsx     # Auth state, role, user
    BrandingContext.tsx # Dynamic branding (CSS vars, title, favicon)
  hooks/               # Data hooks (useLeaveRequests, useEmployees, useBranding, etc.)
  lib/                 # Utilities (permissions, leave-workflow, validations, etc.)
  pages/               # Route page components (lazy-loaded)
  types/
    hrms.ts            # Shared TypeScript types (Profile, LeaveRequest, AppRole, etc.)
  integrations/
    supabase/
      client.ts        # Supabase client instance
      types.ts         # Auto-generated DB types (DO NOT hand-edit)

supabase/
  migrations/          # Sequential SQL migrations (YYYYMMDDHHMMSS_name.sql)
  seeds/               # Seed data scripts
  tests/               # SQL-level tests (pgTAP)
  functions/           # Edge functions
```

## 8. Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `profiles` | Employee profiles (extended with lifecycle fields) |
| `departments` | Organizational departments |
| `user_roles` | Role assignments (1 role per user) |
| `leave_types` | Leave type definitions (days_allowed, requires_document, min_days) |
| `leave_requests` | Leave requests with multi-stage approval workflow |
| `leave_balances_override` | Manual balance adjustments |
| `leave_approval_workflows` | Configurable approval route per requester role |
| `employee_lifecycle_events` | Lifecycle events (hired, promoted, etc.) |
| `onboarding_checklists` | Onboarding task items per employee |
| `tenant_branding` | Company branding configuration (singleton) |
| `attendance_records` | Daily attendance |
| `holidays` | Company holidays |
| `announcements` | Company announcements |
| `documents` | Employee documents |
| `payroll_records` | Payroll data |
| `audit_log` | Admin audit trail |

## 9. Non-Negotiable Guardrails

1. **Never touch admin dashboard** pages/components unless explicitly asked
2. **Always use RLS** — no `SECURITY DEFINER` unless absolutely necessary (and document why)
3. **Never bypass RBAC** — always check permissions on both frontend and backend
4. **Keep pages under 200 lines** — extract logic to hooks, extract UI to components
5. **Use system components** for consistent UI (PageHeader, DataTableShell, ModalScaffold, StatusBadge)
6. **Don't hand-edit `types.ts`** — regenerate from schema
7. **Run tests before deploying** — `npx vitest run` must pass
8. **Create migrations, don't modify existing ones** — new file with next timestamp
9. **Toast for user feedback** — `toast.success()` / `toast.error()` via sonner
10. **Mutations invalidate queries** — always call `queryClient.invalidateQueries()` on success

## 10. Task Templates

### Add a New Feature
```
1. Plan: What tables/columns/RPCs are needed?
2. DB: Create migration in supabase/migrations/ (include RLS policies)
3. Apply: Use Management API to execute SQL
4. Types: Regenerate src/integrations/supabase/types.ts
5. Hooks: Create data hooks in src/hooks/ (useQuery + useMutation)
6. Components: Build UI components in src/components/<feature>/
7. Page: Create page in src/pages/, wire route in App.tsx
8. Test: Run vitest, fix failures
9. Build & Deploy
```

### Fix a Bug
```
1. Reproduce: Identify the exact behavior
2. Trace: Hook → Supabase query → RLS → Data
3. Fix: Apply minimal targeted fix
4. Test: Verify fix doesn't break existing tests
5. Build & Deploy
```

### Redesign a Module
```
1. Audit: Read all components, hooks, and DB tables for the module
2. Plan: Design new component tree, identify reusable system components
3. Implement: Build new components alongside old ones
4. Swap: Update page to use new components
5. Clean: Remove old components if fully replaced
6. Test: Run full test suite
7. Build & Deploy
```

---

## YOUR TASK

> *Replace this section with your specific request. Examples:*
> - "Add a document management feature where HR can upload and categorize employee documents"
> - "Fix the leave balance calculation — it's showing incorrect remaining days"
> - "Redesign the attendance page to show a weekly calendar view"
