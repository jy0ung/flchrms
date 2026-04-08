# FLCHRMS Codebase Audit Report & Development Roadmap

**Date**: April 8, 2026  
**Scope**: Frontend UX/UX, route permissions, code design, information hierarchy  
**Status**: Initial Audit Complete

---

## Executive Summary

FLCHRMS has a solid foundational architecture with React + Supabase, clear role-based access control, and modular component organization. However, there are **three major improvement opportunities**:

1. **Route Access Consolidation**: Admin route guard was too broad (using `AUTHENTICATED_APP_ROLES`); now tightened to `ADMIN_PAGE_ALLOWED_ROLES` ✅
2. **Permission Check Inconsistency**: Mixed use of role-based helpers and capability-map checks across navigation and pages
3. **Module Layout Standardization**: Core layouts are well-designed but have opportunity to standardize information hierarchy across all major workspaces

---

## Audit Findings by Category

### 1. Route Access & Navigation

**Finding**: Admin route protection was overly permissive.
- **Issue**: `/admin/*` routes used `AUTHENTICATED_APP_ROLES` guard, allowing any authenticated user to attempt access; relied on page-level capability checks
- **Impact**: Unclear permission boundary; potential for UX confusion when users see 404 or access-denied after reaching admin shell
- **Status**: ✅ FIXED — Changed to `ADMIN_PAGE_ALLOWED_ROLES` at route level

**Finding**: Sidebar navigation permission checks are inconsistent.
- **Issue**: 
  - Some items use helper functions: `canViewEmployeeDirectory()`, `canConductPerformanceReviews()`, `canManageDocuments()`
  - Others use direct capability map: `capabilityMap.access_admin_console`, `capabilityMap.manage_departments`
  - No unified pattern; inconsistent naming and access patterns
- **Impact**: Maintenance burden; potential drift between sidebar visibility and actual page access policies
- **Risk Level**: Medium
- **Example**: 
  ```typescript
  // Inconsistent pattern in AppSidebar.tsx
  const scopedRecords = recordsNavigation.filter((item) => {
    if (item.href === '/documents') return canManageDocuments(role);  // ✓ helper function
    return true;
  });
  const scopedPeople = peopleNavigation.filter((item) => {
    if (item.href === '/departments') return capabilityMap.manage_departments;  // ✓ capability map
    return true;
  });
  ```

### 2. Permission & RBAC Architecture

**Finding**: Dual permission systems exist without clear separation.
- **Issue**:
  - `src/lib/permissions.ts` — Role-based access (defines role matrices, exports helper functions)
  - `src/lib/admin-permissions.ts` + `src/lib/admin-capabilities.ts` — Capability-based access (capability maps, dynamic overrides)
  - Both are valid patterns but used inconsistently; roles determine defaults, but capabilities allow override
- **Impact**: Complex mental model for developers; risk of permission check duplication
- **Current State**: 
  - Admin pages use capability maps (`useMyAdminCapabilities()` hook)
  - Module pages use role helpers (`canViewEmployeeDirectory()`)
  - Sidebar mixes both patterns
- **Recommendation**: Unify on capability-first pattern with role defaults fallback

**Finding**: Permission helper functions in `permissions.ts` not always used.
- **Issue**: 
  - 40+ permission helper functions defined but not uniformly adopted
  - Some pages check roles directly or inline conditions instead of using helpers
- **Impact**: Harder to audit permission policy; difficult to make global permission changes
- **Example**:
  ```typescript
  // In permissions.ts, defined but underutilized
  export const ADMIN_PAGE_ALLOWED_ROLES: AppRole[] = ['admin', 'hr', 'director', 'general_manager'];
  // Used in app.tsx ✓
  // But NOT directly in sidebar—sidebar uses capability map instead ✗
  ```

### 3. Module Layout & Workspace UX

**Finding**: Module layout patterns are well-established but information hierarchy varies.
- **Status**: Leave, Payroll, and Employees use `ModuleLayout` consistently ✓
- **Observation**: 
  - Header pattern: eyebrow, title, description, action buttons → standardized ✓
  - Toolbar pattern: search, filters, actions → standardized ✓
  - Summary rail: operational metrics → standardized ✓
  - Sidebar supporting context → present in Leave, Payroll, but uses different naming/structure
- **UX Hierarchy Opportunity**: Leave workspace has rich "operationalMetricItems" + "referenceMetricItems"; only some pages replicate this level of metadata guidance

**Finding**: Admin pages use different layout wrapper (`UtilityLayout` + `SidebarProvider`).
- **Issue**: Admin shell (`AdminLayout.tsx`) uses Radix sidebar vs. app shell (`AppLayout.tsx`) uses custom sidebar
- **Impact**: Different interaction patterns; inconsistent mobile experience
- **Status**: By design (governance shell != operational shell), but worth documenting

**Finding**: Page focus and skip-links are well-implemented.
- Status: ✓ Both `AppLayout` and `AdminLayout` include skip-to-main-content links; `AppLayout` has accessibility-aware mobile bottom nav
- Opportunity: Consider extending breadcrumb accessibility to app shell (currently only in admin shell)

### 4. Shared UI System

**Finding**: System components are well-organized and reused.
- **Status**: 
  - 30+ shared components in `src/components/system/`
  - Coverage: `DataTableShell`, `ModalScaffold`, `SectionToolbar`, `RecordSurfaceHeader`, `ContextChip`, `StatusBadge`, `QueryErrorState`, `Skeletons`
  - Good unit test coverage (most components have `.test.tsx` files)
- **Opportunity**: Ensure all new pages leverage existing system components rather than introducing custom scaffolding

**Finding**: Dialog and modal patterns are centralized.
- **Status**: ✓ `ModalScaffold`, `ModalSection`, `ConfirmationDialog` provide consistent patterns
- **Usage**: Leave module, admin dialogs all use shared patterns

---

## Root Causes & Technical Debt

1. **Incremental Evolution**: Permission model evolved from simple role-based → capability-based over time; both patterns coexist
2. **Two Navigation Contexts**: App shell (user-facing) vs. admin shell (governance) have different lifecycle and gating strategies
3. **Role vs. Capability Naming**: `ADMIN_PAGE_ALLOWED_ROLES` implies role-based, but pages also gate on capabilities
4. **Admin Page Capabilities**: `getAdminCapabilities()` is defined but sidebar doesn't consistently use it

---

## Development Improvement Roadmap

### Phase 1: Route & Navigation Hardening (1-2 sprints)

**Objective**: Lock down route access and standardize permission checks in navigation.

**Tasks**:

1. **Unify Sidebar Permission Checks** 
   - Refactor `AppSidebar.tsx` to use role-based helpers consistently (avoid mixing with capability map)
   - Export wrapper functions: `canViewAdminConsole(role)`, `canManageDepartments(role)` from `permissions.ts`
   - Update sidebar to always call permission helpers, never access `capabilityMap` directly
   - Duration: 2–3 hours
   - Verification: Lint rule to flag direct `capabilityMap` access in nav components

2. **Document Route + Role Mapping**
   - Update `docs/specs/01-product-functional-spec.md` route table with new `ADMIN_PAGE_ALLOWED_ROLES` enforced gate
   - Add inline comments to `src/App.tsx` explaining each route's role guard
   - Duration: 1–2 hours
   - Verification: Manual review against `docs/admin-architecture.md`

3. **Add Route Access E2E Test**
   - Create `e2e/access-control-routes.spec.ts` to verify unauthorized roles are redirected
   - Test cases: Employee → `/admin` (→ 404), Manager → `/admin/roles` (→ 404), HR → `/admin/roles` (✓)
   - Duration: 3–4 hours
   - Verification: Run against deployed test tenant

### Phase 2: Permission Architecture Clarification (2-3 sprints)

**Objective**: Establish clear mental model: capabilities override roles, but roles are the primary gate.

**Tasks**:

1. **Create Permission Governance Guide**
   - New document: `docs/permission-architecture.md`
   - Sections: role hierarchy, capability keys, override semantics, common patterns
   - Example: "When to use role helpers vs. capability checks"
   - Duration: 3–4 hours
   - Verification: Share with team; verify clarity

2. **Consolidate Permission Helpers**
   - Move `canAccessAdminPage()` use to all navigation (currently inconsistent)
   - Ensure `useMyAdminCapabilities()` hook is only used in admin pages, not app shell nav
   - Add JSDoc comments to permission functions explaining role vs. capability distinction
   - Duration: 2–3 hours
   - Verification: Grep for direct capability access in nav; should be 0

3. **Add Permission Audit Tests**
   - Create `src/lib/__tests__/permission-audit.test.ts`
   - Test: All sidebar items have corresponding `canXxx()` helper
   - Test: No role-based pages check `capabilityMap` directly
   - Test: Admin capability matrix matches documented authority tiers
   - Duration: 2–3 hours
   - Verification: Vitest runs; allows future refactors safely

### Phase 3: UX Hierarchy Standardization (2-3 sprints)

**Objective**: Establish consistent information hierarchy across all major workspaces.

**Tasks**:

1. **Audit & Document Workspace Patterns**
   - Review all module pages (Leave, Payroll, Employees, Departments)
   - Document observed patterns: summary rails, metric tiers, supporting context
   - Identify which pages are missing operational vs. reference metrics
   - Duration: 2–3 hours
   - Deliverable: Table mapping pages to their metric categories

2. **Extend Workspace Metrics to High-Impact Pages**
   - Payroll: Add operational metrics (draft periods, in-process) → already done ✓
   - Employees: Add operational metrics (pending approvals, active filters) → add if missing
   - Departments: Ensure consistent metric structure vs. Employees page
   - Duration: 4–6 hours
   - Verification: Visual regression tests; Playwright smoke tests

3. **Standardize Supporting Context Panels**
   - Leave workspace has rich "supporting context" sidebar; document pattern
   - Identify pages that could benefit from this (e.g., Payroll, Performance)
   - Create reusable `ModuleLayout.SupportingContext` component pattern if needed
   - Duration: 3–4 hours
   - Verification: Design review; accessibility check for focus management

### Phase 4: Admin Shell UX Alignment (1-2 sprints)

**Objective**: Improve consistency between app shell and admin shell navigation and layout.

**Tasks**:

1. **Add Breadcrumbs to App Shell (Optional)**
   - Admin shell has breadcrumb navigation; app shell does not
   - Evaluate if breadcrumbs help in deep navigation (e.g., `/employees/:id`)
   - Implementation: Extend `TopBar` component with breadcrumb slot
   - Duration: 2–3 hours
   - Verification: Playwright smoke test for `/employees/:id` page

2. **Align Mobile Bottom Nav with Sidebar Logic**
   - Review `MobileBottomNav` and `buildBottomNavItems()`
   - Ensure mobile routing respects same permission checks as sidebar
   - Duration: 1–2 hours
   - Verification: Mobile E2E tests for role-based nav visibility

3. **Document Admin Shell Rationale**
   - Update `docs/admin-architecture.md` with info on why separate sidebar/layout was chosen
   - Clarify when to use `AdminLayout` vs. `AppLayout` for new pages
   - Duration: 1–2 hours
   - Verification: Share with team; close any outstanding architecture questions

### Phase 5: Testing Coverage & Documentation (1-2 sprints)

**Objective**: Ensure permission and route logic are well-tested and future-proof.

**Tasks**:

1. **Expand Permission Unit Tests**
   - Increase coverage of `src/lib/permissions.ts` and `src/lib/admin-permissions.ts`
   - Add matrix tests: for each role, verify all expected capabilities
   - Add regression tests for past permission bugs (e.g., role tier inversion)
   - Duration: 3–4 hours
   - Verification: Coverage report; >85% line coverage

2. **Add Route Access Integration Tests**
   - Create `src/test/integration/route-access.integration.test.ts`
   - Test real navigation flows with mocked auth state
   - Verify routes redirect correctly for unauthorized users
   - Duration: 3–4 hours
   - Verification: Vitest integration config; runs as part of `test:integration`

3. **Update Root README with Permission Model**
   - Add section to `README.md`: "Understanding Permissions"
   - Link to `docs/permission-architecture.md` and `docs/admin-architecture.md`
   - Provide quick reference: role → admin capabilities matrix
   - Duration: 1–2 hours
   - Verification: New team member review

---

## Implementation Priority & Timeline

| Phase | Focus | Duration | Risk | Value |
|-------|-------|----------|------|-------|
| **1** | Route & Nav hardening | 1–2 sprints | Low | High |
| **2** | Permission architecture clarity | 2–3 sprints | Low | High |
| **3** | UX hierarchy standardization | 2–3 sprints | Medium | Medium–High |
| **4** | Admin shell alignment | 1–2 sprints | Low | Medium |
| **5** | Testing & docs | 1–2 sprints | Low | High |

**Recommended start**: Phase 1 + Phase 2 in parallel (non-blocking); this stabilizes the permission foundation and improves confidence in route access.

---

## Success Metrics

1. **Route Access**: All unauthorized role/route combinations produce graceful 404 or feature-unavailable messaging (zero hangs or error state inconsistencies)
2. **Permission Checks**: 100% of navigation permission checks use exported helpers; zero direct role/capability checks in nav components
3. **UX Consistency**: All major workspace pages (>5 pages) follow same module layout + metric pattern
4. **Test Coverage**: Permission logic >85% line coverage; route access has dedicated E2E suite
5. **Documentation**: New team members can understand permission model in <30 min by reading docs and code

---

## Appendix: High-Risk Issues Identified

### Issue 1: Permission Check Fragmentation (Medium Risk)

**Summary**: Sidebar, pages, and dialogs check permissions via different mechanisms.

**Examples**:
- Sidebar: `canViewEmployeeDirectory(role)` vs. `capabilityMap.manage_departments`
- Leave page: `getLeaveBalancePermissions(role)`
- Admin pages: `useMyAdminCapabilities(role)` hook

**Mitigation**: Unify on role-based helpers in nav; capability maps only for admin override logic.

---

### Issue 2: Admin Capability Override Not Reflected in Route Checks (Low-Medium Risk)

**Summary**: Capability map can disable admin access, but route check only uses `ADMIN_PAGE_ALLOWED_ROLES`.

**Example**: If a Director's `access_admin_console` capability is disabled, they can still reach `/admin` at route level, but `AdminLayout` will redirect to dashboard (page-level check).

**Current Behavior**: Graceful fallback, but inconsistent messaging.

**Mitigation**: Document this as "page-level gating for capability overrides"; add E2E test to verify UX is clear.

---

### Issue 3: Mobile Navigation May Diverge from Desktop (Low Risk)

**Summary**: Mobile bottom nav built from `buildBottomNavItems()` function; unclear if it respects all same permissions as desktop sidebar.

**Mitigation**: Phase 4, Task 2: Align mobile nav with sidebar logic.

---

## Next Steps

1. **Immediate**: Communicate changes from Phase 1 (route guard fix) to team
2. **This Sprint**: Assign Phase 1 tasks (sidebar unification + documentation)
3. **Planning**: Sequence Phase 2 + Phase 3 for capacity planning
4. **Monitoring**: Track permission-related bugs weekly; correlate with improvements

---

**Report Author**: Audit Bot  
**Stakeholders**: Engineering Team, Product, QA  
**Last Updated**: April 8, 2026
