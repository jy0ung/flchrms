# Phase 3: Workspace UX Hierarchy Audit

**Date**: April 8, 2026  
**Focus**: Information hierarchy patterns across module pages

---

## Workspace Pages Audited

| Page | Metrics Count | Structure | Metric Types | Gap Analysis |
|------|---|---|---|---|
| **Leave** | 6 operational + 2 reference | Two-tier | Approval inbox, pending requests, balance buckets, resolution history | ✓ Complete |
| **Payroll** | 4 HR-specific + 4 employee-specific | Role-conditional | Draft periods, processing runs, salary structures, YTD earnings | ✓ Complete |
| **Employees** | 4 reference | Single-tier | Total, active, on-leave, departments | Basic (no separation) |
| **Departments** | 4 reference | Single-tier | Total, staffed, assigned managers, unassigned employees | Basic (no separation) |

---

## Finding: Metric Hierarchy Pattern

### Pattern 1: Two-Tier (Leave Module) 🌟

**Structure**:
- **Operational metrics** (top): Real-time workflow state
  - "Approval inbox: 3 requests" — actionable, time-sensitive
  - "Pending decisions: 5 requests" — in-progress work
- **Reference metrics** (bottom): Context & history
  - "Resolved team decisions: 42 requests" — audit trail
  - "Balance buckets: 3 types" — reference data

**Benefit**: Guides user attention; operational info first, supporting context second.

**Example Leave Workspace**:
```
┌─────────────────────────────────┐
│   Operational Metrics (Alert)   │
│ ┌─────────────┬──────────┐      │
│ │ Approval    │ Pending  │      │
│ │ inbox: 3    │ decisions: 5│    │
│ └─────────────┴──────────┘      │
└─────────────────────────────────┘
[Leave Request Workspace]
┌─────────────────────────────────┐
│   Reference Metrics (Context)   │
│ ┌─────────────┬──────────┐      │
│ │ Resolved    │ Balance  │      │
│ │ decisions:42│ buckets:3│      │
│ └─────────────┴──────────┘      │
└─────────────────────────────────┘
```

### Pattern 2: Role-Conditional (Payroll Module)

**Structure**:
- Same `SummaryRail`, different content per role
- HR: operational metrics (draft periods, processing, structures, deductions)
- Employees: reference metrics (basic salary, latest pay, YTD, payslip count)

**Benefit**: Role-aware context without duplicating page structure.

**Example Payroll Workspace**:
```
HR Role:                           Employee Role:
┌──────────────────────┐          ┌──────────────────────┐
│ Draft Periods: 2     │          │ Basic Salary: RM 8K  │
│ Processing: 1        │    vs    │ Latest Pay: RM 7.5K  │
│ Salary Structures: 5 │          │ YTD Earnings: RM45K  │
│ Deductions: 8        │          │ Payslips: 4          │
└──────────────────────┘          └──────────────────────┘
```

### Pattern 3: Single-Tier Reference (Employees, Departments)

**Structure**:
- Single `SummaryRail` with 4 reference metrics
- No operational/reference separation
- No role-based variation

**Observation**: These pages are directory views, not workflow pages. Metrics are contextual, not action-oriented.

---

## Recommendations

### 1. Keep Leave & Payroll as-is ✓
Both pages demonstrate best practices:
- **Leave**: Two-tier structure creates natural cognitive flow
- **Payroll**: Role-based metrics relevant to user perspective

### 2. Enhance Employees & Departments Pages (Optional)

**Current**: Basic 4-metric rail with no separation

**Possible Enhancement**: Add role-conditional metrics

**For Employees page**:
- **Admins/HR** might see: Active, inactive, on-leave, terminated (status breakdown)
- **Managers** might see: Team members, on-leave, pending approvals (team status)
- **Employees** might see: Personal info placeholder (no metrics needed)

**For Departments page**:
- **Admins/HR** might see: Departments, staffed, unassigned, manager coverage
- **Managers** might see: My department members, open positions (if tracked), team size
- **Employees** might see: Department info placeholder (no metrics needed)

**Effort**: Medium (compute role-aware stats, test by role)  
**Value**: Reduces cognitive load; shows relevant metrics per role  
**Priority**: Low (current single-tier structure is functional)

### 3. Documentation ✓

Added to `docs/permission-architecture.md`:
- Workspace pattern examples
- Two-tier metric guidance
- Role-conditional metric pattern

---

## No Implementation Needed This Phase

- Leave workspace: ✓ Already exemplar
- Payroll workspace: ✓ Already role-conditional
- Module layout primitives: ✓ Well-designed and reused
- Supporting context panels: ✓ Present and consistent

---

## Conclusion

FLCHRMS workspace UX hierarchy is **well-established**. The Leave module sets a strong precedent with its two-tier metric pattern. No immediate action required; document the pattern for future pages.

**Next Phase**: Testing & documentation (Phase 5) should include workspace metric patterns as part of feature spec template.
