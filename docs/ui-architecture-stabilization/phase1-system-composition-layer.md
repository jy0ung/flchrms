# Phase 1 System Composition Layer (Scaffolds)

This document defines the initial composition-layer APIs under `src/components/system/`.

Phase 1 goals:
- establish reusable structural components
- keep compatibility with existing primitives
- avoid page migrations in this phase
- avoid behavior changes

## Components Delivered

- `StatusBadge` + status registry (`src/lib/status-system.ts`)
- `PageHeader`
- `SectionToolbar`
- `DataTableShell`
- `ModalScaffold`
- `ModalSection`

## Compatibility Model

These components are wrappers/compositions built on top of current primitives:
- `Badge`
- `Button`
- `Card`
- `Dialog` primitives
- `Input`
- existing spacing/border/shadow tokens

No page behavior changes are required to adopt them.

## Usage Examples

### 1. `StatusBadge`

```tsx
import { StatusBadge } from "@/components/system";

<StatusBadge status="pending" />
<StatusBadge status="approved" showIcon />
<StatusBadge status={leave.status} labelOverride="Awaiting Approval" />
```

### 2. `PageHeader`

```tsx
import { PageHeader } from "@/components/system";
import { Bell, SlidersHorizontal } from "lucide-react";

<PageHeader
  title="Dashboard"
  description="Role-based operational overview"
  chips={[
    { id: "scope", label: "Team visibility enabled" },
    { id: "critical", label: "Critical insights enabled", tone: "info" },
  ]}
  actions={[
    { id: "notifications", label: "Notifications", icon: Bell, variant: "outline" },
    { id: "customize", label: "Edit Dashboard", icon: SlidersHorizontal, variant: "default" },
  ]}
/>
```

### 3. `SectionToolbar`

```tsx
import { SectionToolbar } from "@/components/system";

<SectionToolbar
  search={{
    value: search,
    onChange: setSearch,
    placeholder: "Search employees...",
  }}
  filters={[
    { id: "status", label: "Status", control: <StatusSelect /> },
    { id: "department", label: "Department", control: <DepartmentSelect /> },
  ]}
  actions={<CreateButton />}
/>
```

### 4. `DataTableShell`

```tsx
import { DataTableShell, SectionToolbar } from "@/components/system";

<DataTableShell
  title="Employee Directory"
  description={`${employees.length} employees`}
  toolbar={
    <SectionToolbar
      search={{ value: search, onChange: setSearch, placeholder: "Search employees..." }}
      actions={<ViewToggle />}
    />
  }
  alertBanner={warningBanner}
  mobileList={<EmployeeMobileCards />}
  table={<EmployeeTable />}
  pagination={<EmployeePagination />}
  emptyState={<EmptyEmployeesState />}
/>
```

### 5. `ModalScaffold` + `ModalSection`

```tsx
import { ModalScaffold, ModalSection, StatusBadge } from "@/components/system";
import { Button } from "@/components/ui/button";

<ModalScaffold
  open={open}
  onOpenChange={setOpen}
  title="Leave Request Details"
  description="Submitted on Feb 26, 2026"
  statusBadge={<StatusBadge status="pending" />}
  headerMeta={<div className="flex gap-2">{metaChips}</div>}
  body={
    <>
      <ModalSection title="Summary">{summaryContent}</ModalSection>
      <ModalSection title="Timeline" tone="muted">{timelineContent}</ModalSection>
    </>
  }
  footer={
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
      <Button onClick={approve}>Approve</Button>
    </>
  }
/>
```

## Accessibility Considerations (Phase 1 Component Baseline)

### `StatusBadge`
- Includes readable text labels (not color-only meaning)
- Optional icon is decorative (`aria-hidden`) unless label override specifies meaning

### `PageHeader`
- Uses a heading element (`h1/h2/h3`) with configurable level
- Region is labeled via `aria-labelledby`
- Action buttons support `ariaLabel`

### `SectionToolbar`
- Region labeled (`aria-label`)
- Search input supports explicit accessible label
- Filter labels can be attached visually and semantically

### `DataTableShell`
- `aria-busy` support during loading
- Region labeling via shell title
- Supports separate mobile/desktop content without changing caller behavior

### `ModalScaffold`
- Built on Radix dialog primitives (focus trap, escape, tab order)
- Status badge integrated into header without breaking title/description semantics
- Sticky footer preserves action visibility in scrollable content

## Extensibility Rationale

### Why a composition layer (`src/components/system/*`)?
- Keeps `src/components/ui/*` as low-level primitives
- Prevents page-level ad hoc layout duplication
- Allows gradual migration without breaking current modules

### Why slot-based APIs?
- Modules have different filters/actions/toolbars
- Slots preserve flexibility while standardizing shell structure
- Reduces pressure to create page-specific forks of shared components

### Why no page migrations in Phase 1?
- Isolates API correctness and compile-time safety first
- Lowers rollout risk
- Makes Phase 2 page migrations smaller and easier to review

## Phase 1 Exit Criteria

- Components compile and export successfully
- APIs are documented and reviewable
- No module behavior changes
- No schema/API changes

