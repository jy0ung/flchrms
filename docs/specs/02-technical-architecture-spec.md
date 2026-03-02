# FLCHRMS Technical Architecture Specification

## 1. Technology Stack

### 1.1 Frontend runtime
- React 18
- TypeScript 5
- Vite 5
- React Router DOM 6
- TanStack React Query 5

### 1.2 UI and UX
- Tailwind CSS
- shadcn/ui components over Radix primitives
- Lucide icons
- Sonner for toast notifications
- next-themes for theme switching

### 1.3 Backend platform
- Supabase Auth
- Supabase Postgres (RLS + RPC + triggers)
- Supabase Storage buckets (`employee-documents`, `leave-documents`)

### 1.4 Testing and tooling
- Vitest + Testing Library (unit/component tests)
- Playwright (E2E)
- SQL regression tests against local Supabase
- ESLint for static analysis

## 2. Runtime Architecture

## 2.1 Application shell
Core shell composition:
- `ThemeProvider`
- `QueryClientProvider`
- `TooltipProvider`
- `BrowserRouter`
- `AuthProvider`
- `LocationAwareErrorBoundary`
- Route tree with lazy-loaded page components

### 2.2 Routing and lazy loading
- Major pages are loaded via `React.lazy` + `Suspense` fallback spinner.
- `/auth` is public.
- All app routes are rendered inside `AppLayout`.
- Sensitive routes are wrapped with `ProtectedRoute` and role lists from `lib/permissions.ts`.
- Unknown routes map to `NotFound`.

### 2.3 Layout model
- Desktop: collapsible left sidebar + top bar + content outlet.
- Mobile: sheet sidebar and fixed bottom navigation.
- Route-level content transitions (`animate-fadeIn`) are keyed by path.
- Skip-to-content accessibility link is present.

## 3. State Management and Data Fetching

### 3.1 Query strategy
Default QueryClient options:
- `staleTime`: 60s
- `gcTime`: 5m
- `refetchOnWindowFocus`: false (override in selected hooks)
- `retry`: 1

Patterns used:
- Query hooks per domain (`useEmployees`, `useLeaveRequests`, etc.)
- Mutations invalidate domain query keys
- Optimistic updates for attendance clock-in/out
- Polling for near-real-time domains (notifications, workflow config events, queue ops)

### 3.2 Domain hook architecture
The app uses hook-centric domain access:
- Each business area has read/mutation hooks in `src/hooks/`
- Hooks encapsulate Supabase table/RPC/storage access
- Toast-based success/error feedback is centralized in mutation handlers
- Error messaging is sanitized through `sanitizeErrorMessage`

### 3.3 Auth state model
`AuthContext` manages:
- `user`, `session`, `profile`, `role`, `isLoading`
- sign-in/up/out methods
- profile refresh

Behavioral architecture:
- Sign-in with non-email identifier uses resolver RPC.
- Blocked profile statuses trigger immediate sign-out guard.
- Idle timeout hook triggers automatic sign-out after inactivity.

## 4. UI System Architecture

### 4.1 System component layer
`src/components/system` provides composable primitives:
- page containers and headers
- section shells
- data table shell
- status badges
- modal scaffolding
- query error states
- interaction mode controls

### 4.2 Interaction mode framework
A route-scoped interaction mode context supports modes:
- `view`, `edit`, `bulk`, `manage`, `customize`

Properties:
- route-change reset behavior
- escape-key reset
- optional persistence key support
- allowed-mode filtering per surface

Used by:
- Dashboard (`customize`)
- Admin (`view/manage/bulk/customize`)

### 4.3 Local UI preference persistence
`lib/ui-preferences.ts` centralizes preference storage and change events.
Examples:
- dashboard widget visibility/layout/version
- admin stats card visibility/layout
- leave display preferences
- floating notifications toggle

A custom DOM event (`hrms:ui-preferences-changed`) plus `storage` listeners provides cross-component reactivity.

## 5. Page and Module Composition Pattern

Most pages follow a consistent composition structure:
1. Set title with `usePageTitle`
2. Load domain data from hooks
3. Compute role-aware view state
4. Render `PageHeader`
5. Render `DataTableShell` or section cards
6. Render dialogs/modals with lifted state

Admin page architecture is further split into:
- orchestration page (`pages/Admin.tsx`)
- domain hooks for employee/department/leave-type state/actions
- presentational tab sections
- dedicated dialog components

## 6. Data Integration Architecture

### 6.1 Supabase integration patterns
The app uses all three Supabase surfaces:
- Table CRUD via `supabase.from(...)`
- Business RPC via `supabase.rpc(...)`
- File operations via `supabase.storage.from(...)`

### 6.2 RPC-first critical workflows
For high-integrity operations, RPC is preferred:
- leave approval
- leave cancellation initiation
- leave amendment
- login identifier resolution
- employee directory masking
- notification queue admin actions

This reduces client race conditions and keeps authorization close to DB-side policy logic.

### 6.3 Storage model
- Leave documents: uploaded to user-scoped paths in `leave-documents`
- Employee documents: uploaded to employee-scoped paths in `employee-documents`
- Download/view uses signed URL generation

## 7. Error Handling and Resilience

- Route error boundary resets on navigation to avoid sticky error states.
- Query error states present explicit retry affordances.
- Mutation failures are surfaced via toasts with sanitized descriptions.
- Selected flows implement optimistic updates with rollback.
- Queue operations include telemetry and health alerting in UI.

## 8. Performance and Scalability Characteristics

Current patterns that support scale:
- Route-level code splitting with lazy loading
- React Query cache and invalidation
- Upper limits on many list queries (`limit` usage)
- DB-side aggregate RPC attempts for dashboard and executive stats
- Combined notification queue dashboard RPC to reduce multiple polling requests

Potential pressure points:
- Some fallback metrics use many parallel count queries when RPC fails.
- Some list views rely on high static row caps (for example `limit(500)`) and may need pagination under higher tenant sizes.

## 9. Security Architecture (Application Layer)

- App-level route guarding using authenticated role context.
- Capability helpers in `lib/permissions.ts` and admin-specific capability matrix in `lib/admin-permissions.ts`.
- Sensitive field visibility rules enforced in UI and reinforced by server-side masked RPC.
- Idle session timeout improves workstation security.

## 10. Architecture Risks and Drift

### 10.1 Supabase type drift
Frontend currently calls RPCs not present in generated Supabase type definitions.
Impact:
- weaker compile-time guarantees for RPC argument/return contracts
- higher risk of runtime contract mismatch

### 10.2 In-flight schema not yet wired
`leave_type_display_config` migration exists but is not yet integrated with frontend leave display customization flow.

### 10.3 Navigation discoverability mismatch
Command palette lists all pages without role filtering. Actual access is still blocked by route guards, but user navigation affordance can expose links that later redirect.
