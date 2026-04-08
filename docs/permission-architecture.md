# Permission Architecture Guide

This document explains how FLCHRMS manages user access through a combination of **role-based access control (RBAC)** and **capability-based access control (CBAC)**.

## Quick Reference

- **Roles**: Fixed, predefined categories (employee, manager, general_manager, hr, admin, director)
- **Capabilities**: Dynamic permissions that can be enabled/disabled per role via admin console
- **Route-level gates**: Use role helpers (fastest, at router boundary)
- **Page-level gates**: Use capability maps when admin overrides are needed
- **Navigation (sidebar)**: Always use role helpers for consistency

---

## The Two-Layer Permission Model

### Layer 1: Role-Based Access (RBAC)

**Where it's defined**: `src/lib/permissions.ts`

**Key concept**: A user's role determines their *default* access level. Roles are immutable at the database level.

#### Role Hierarchy

```
┌─────────────┐
│   employee  │  Tier 1: Individual contributor
└─────────────┘

┌─────────────┐
│  manager    │  Tier 2: Team oversight
└─────────────┘

┌───────────────────┐
│ general_manager   │  Tier 3: Department oversight
└───────────────────┘

┌─────────────┐
│     hr      │  Tier 4: HR operations
└─────────────┘

┌──────────────┐
│    admin     │  Tier 5: System administration
└──────────────┘

┌──────────────┐
│  director    │  Tier 6: Executive + role governance
└──────────────┘
```

**Important**: Director (tier 6) is highest; admin (tier 5) cannot assign roles to directors.

#### Role-to-Feature Mapping

| Role | Key Features |
|------|---|
| `employee` | Own profile, own leave requests, own notifications, own payslips |
| `manager` | Team leave approvals, team calendar, performance reviews, department events |
| `general_manager` | Admin console access (limited), employee directory, team oversight |
| `hr` | Full admin console, employee management, leave policy configuration, payroll |
| `director` | Admin console + role governance, employee/dept management, payroll |
| `admin` | Full system control, capability overrides, audit access |

### Layer 2: Capability-Based Access (CBAC)

**Where it's defined**: `src/lib/admin-capabilities.ts` and `src/hooks/admin/useAdminCapabilities.ts`

**Key concept**: Admin users can *override* role-based defaults by enabling/disabling specific capabilities per role.

#### Why CBAC?

- Flexibility: HR might want to restrict a director's ability to reset passwords
- Gradual rollout: Enable new features for only specific roles first
- Emergency: Quickly disable access without changing roles

#### Capability Keys

Available capabilities (defined in `AdminCapabilityKey`):

- `access_admin_console` — Can enter /admin
- `view_admin_dashboard` — Can view governance dashboard
- `view_admin_quick_actions` — Can use quick actions
- `view_admin_audit_log` — Can view audit trails
- `manage_employee_directory` — Can manage employees
- `create_employee` — Can register new employees
- `reset_employee_passwords` — Can reset passwords
- `manage_departments` — Can manage departments
- `manage_roles` — Can assign/modify roles
- `manage_leave_policies` — Can configure leave rules
- `manage_announcements` — Can create announcements
- `manage_admin_settings` — Can change platform settings
- `view_sensitive_employee_identifiers` — Can see masked data unmasked

#### Capability Flow

```
[User role] → [Default capability matrix] → [Admin overrides] → [Final capability set]
                                                  ↓
                                        AdminLayout checks capabilities
                                        and may redirect non-authorized users
```

---

## Using Permissions in Code

### Pattern 1: Route-Level Gating (Fastest)

**Location**: `src/App.tsx`

**When to use**: Protecting entire route subtrees; most common pattern

**Example**:
```tsx
<Route element={<ProtectedRoute allowedRoles={PERFORMANCE_REVIEW_CONDUCTOR_ROLES} />}>
  <Route path="/performance" element={<Performance />} />
</Route>
```

**Helper functions**:
- `canAccessAdminPage()` — Alias: `canAccessAdminConsole()`
- `canViewEmployeeDirectory()`
- `canManageDocuments()`
- `canConductPerformanceReviews()`
- `canManagePayroll()`
- etc.

**Always use**: Defined helpers from `src/lib/permissions.ts`, never inline role checks.

---

### Pattern 2: Navigation Gating (Sidebar/Bottom Nav)

**Location**: `src/components/layout/AppSidebar.tsx`

**When to use**: Controlling whether a nav item is visible

**Example**:
```tsx
const scopedAdmin = filterHiddenNavItems(
  canAccessAdminConsole(role) ? adminNavigation : [],
  hiddenMobileHrefs
);
```

**Rule**: Navigation *always* uses role helpers, never capability maps.

**Rationale**: Navigation is a UX hint; it's not a security boundary. Capabilities are an admin override, not a navigation decision.

---

### Pattern 3: In-Page Feature Gating

**Location**: Page components like `/pages/admin/AdminRolesPage.tsx`

**When to use**: Hiding UI elements or features within a page when capability overrides are relevant

**Example** (admin page):
```tsx
const { capabilities } = useAdminPageCapabilities(role);

if (!capabilities.canManageRoles) {
  return <AdminAccessDenied />;
}
```

**Rule**: Only use capability maps when the page itself is capability-gated (admin pages).

**Why**: Most pages are role-gated at the router level. Admin pages are an exception because capabilities can enable/disable admin features dynamically.

---

### Pattern 4: Business Logic Gating

**Location**: Module pages like `src/modules/leave/LeavePage.tsx`

**When to use**: Showing/hiding features based on role (e.g., "Approve leave" button only for managers and above)

**Example**:
```tsx
const pageActions = useMemo(() => ({
  canApprove: canViewTeamLeaveRequests(role),
  canAdjustBalance: canAdjustLeaveBalance(role),
}), [role]);
```

**Rule**: Use permission helpers from `src/lib/permissions.ts` exclusively. Do NOT use capability maps.

---

## Common Patterns & Examples

### Scenario: "Should a button be enabled?"

**Check**: Is it a nav item?
- Yes → Use role helper in sidebar
- No → Use role helper in page component

**Code**:
```tsx
const canApproveLeaves = canViewTeamLeaveRequests(role);
return <Button disabled={!canApproveLeaves}>Approve</Button>;
```

---

### Scenario: "Can this user access /admin?"

**Check**: Route level → Page level → Feature level

1. **Route Level** (ProtectedRoute):
   ```tsx
   <Route element={<ProtectedRoute allowedRoles={ADMIN_PAGE_ALLOWED_ROLES} />}>
   ```
   Blocks: employees, managers (redirects to /dashboard)

2. **Page Level** (AdminLayout):
   ```tsx
   if (!capabilities.canAccessAdminPage) {
     return <Navigate to="/dashboard" replace />;
   }
   ```
   Blocks: Anyone whose capability was disabled by admin

3. **Feature Level** (AdminRolesPage):
   ```tsx
   if (!capabilities.canManageRoles) {
     return <AdminAccessDenied />;
   }
   ```
   Shows which admin features are available

---

### Scenario: "How do I add a new permission?"

**Step 1**: Define the role matrix in `src/lib/permissions.ts`

```tsx
export const MY_FEATURE_ALLOWED_ROLES: AppRole[] = ['admin', 'hr', 'director'];

export function canAccessMyFeature(role: MaybeRole) {
  return hasRole(role, MY_FEATURE_ALLOWED_ROLES);
}
```

**Step 2**: Gate the route or page

```tsx
// Route level
<Route element={<ProtectedRoute allowedRoles={MY_FEATURE_ALLOWED_ROLES} />}>
  <Route path="/my-feature" element={<MyFeature />} />
</Route>

// Or in-page
const canAccess = canAccessMyFeature(role);
```

**Step 3**: Test it

```tsx
expect(canAccessMyFeature('admin')).toBe(true);
expect(canAccessMyFeature('employee')).toBe(false);
```

---

## Troubleshooting

### Problem: User can see an admin page but can't use features

**Likely cause**: Route-level gate passed (role correct) but page-level capability is disabled.

**Fix**: Admin user or super-admin should re-enable capability in admin console, OR update the capability default in `src/lib/admin-capabilities.ts`.

---

### Problem: Navigation shows item but route is blocked

**Likely cause**: Sidebar uses capability map, but route uses role-based gate (or vice versa).

**Fix**: Use role helpers consistently in nav; both should use same function.

---

### Problem: Permission check is inconsistent across pages

**Likely cause**: Mixing role helpers and capability maps.

**Rule of thumb**:
- Sidebar = always role helpers
- Module pages = always role helpers
- Admin pages = role helpers for nav, capability maps for feature gating

---

## Testing Permissions

### Unit Tests

Located in `src/lib/permissions.test.ts` and `src/lib/admin-permissions.test.ts`.

**Test structure**:
```tsx
describe('permissions', () => {
  it('allows admin to access feature', () => {
    expect(canAccessMyFeature('admin')).toBe(true);
  });

  it('blocks non-admin from accessing feature', () => {
    expect(canAccessMyFeature('employee')).toBe(false);
  });
});
```

**Coverage target**: >85% line coverage in permission modules.

---

### Integration Tests

Located in `src/test/integration/` (planned for Phase 5).

**Test structure**:
- Mock auth context with specific role
- Navigate to protected route
- Verify redirect or success

---

### E2E Tests

Located in `e2e/` with `@rbac` tag.

**Test structure**:
- Real browser, real server
- Log in as each role
- Verify navigation visibility and route access

**Run**: `npm run test:rbac:e2e`

---

## Key Takeaways

1. **Roles are the primary gate**; use role helpers everywhere
2. **Capabilities are admin overrides**; only used in admin pages
3. **Navigation always uses roles**; capabilities don't hide nav items
4. **Route > Page > Feature**; defense in depth
5. **Helper functions are mandatory**; inline checks are anti-patterns
6. **Test permissions early**; permission bugs are security bugs

---

## Related Documentation

- [Admin Architecture](./admin-architecture.md) — Governance shell details
- [Product Functional Spec](./specs/01-product-functional-spec.md) — Feature & role mapping
- [RBAC Test Matrix](./rbac-playwright-matrix.md) — E2E test coverage by role

---

**Last Updated**: April 8, 2026  
**Maintained by**: Engineering Team
