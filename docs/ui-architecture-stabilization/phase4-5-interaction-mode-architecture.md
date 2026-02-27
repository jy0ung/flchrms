# Phase 4.5 Interaction Mode Architecture

This phase establishes governed, route-scoped interaction modes for structural UI state management.

Scope:
- no RBAC changes
- no API/schema changes
- no business logic changes
- no visual redesign

## Goals

1. Standardize interaction states:
   - `view`
   - `edit`
   - `bulk`
   - `manage`
   - `customize`
2. Eliminate cross-page mode bleed.
3. Prevent large mode-specific layout injection.
4. Reuse one contract across Dashboard, Admin, Leave, Employees, and future modules.

## Component APIs

## Layout Model (`src/lib/editable-layout.ts`)

```ts
type LayoutItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type LayoutState = {
  version: number;
  items: LayoutItem[];
};
```

Implemented helpers:
- `compactLayoutItems()`
- `compactLayoutState()`
- `buildLayoutStateFromOrder()`
- `mergeLayoutStateWithIds()`
- `moveLayoutItem()`
- `setLayoutItemWidth()`
- `addLayoutItem()`
- `removeLayoutItem()`

Compaction strategy:
1. sanitize dimensions and coordinates
2. deterministic sort (`y`, `x`, `id`)
3. place each item in earliest non-colliding cell in a 12-column grid
4. keep preferred `x` when possible
5. output compacted `x/y/w/h` without holes

## `EditableCanvas`

```ts
interface EditableCanvasItem {
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  view: ReactNode;
}

interface EditableCanvasProps {
  mode: "view" | "customize" | "edit" | "bulk" | "manage";
  items: EditableCanvasItem[];
  layoutState: LayoutState;
  onLayoutStateChange: (next: LayoutState) => void;
  onHideItem?: (itemId: string) => void;
  columns?: number; // default 12
  widthSteps?: readonly number[]; // default [4,8,12]
  rowHeightClassName?: string;
}
```

Responsibilities:
- one grid model for both view and customize
- tile representation in customize mode
- live widget representation in view mode
- drag reorder and resize width in customize mode
- deterministic layout updates emitted through `onLayoutStateChange`

## `LayoutTile`

```ts
interface LayoutTileProps {
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  width: number;
  widthSteps: readonly number[];
  onWidthChange: (width: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onHide?: () => void;
  onDragStart?: DragEventHandler<HTMLButtonElement>;
  onDragEnd?: DragEventHandler<HTMLButtonElement>;
}
```

Contract:
- fixed-height tile in customize mode
- single inline control row (drag, size, move, hide)
- no extra block injected above grid

## `interaction-mode.ts`

```ts
type InteractionMode = "view" | "edit" | "bulk" | "manage" | "customize";

const INTERACTION_MODES: readonly InteractionMode[];
const DEFAULT_INTERACTION_MODE: InteractionMode;
const INTERACTION_MODE_LABELS: Record<InteractionMode, string>;

function isInteractionMode(value: string): value is InteractionMode;
function normalizeInteractionModes(modes?: readonly InteractionMode[]): InteractionMode[];
```

## `InteractionModeProvider`

```ts
interface InteractionModeContextValue {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  resetMode: () => void;
  is: (mode: InteractionMode) => boolean;
  allowedModes: readonly InteractionMode[];
  defaultMode: InteractionMode;
  routeScope: string;
}

interface InteractionModeProviderProps {
  children: ReactNode;
  defaultMode?: InteractionMode;
  allowedModes?: readonly InteractionMode[];
  resetOnRouteChange?: boolean; // default true
  resetOnEscape?: boolean; // default true
  resetKeys?: readonly (string | number | boolean | null | undefined)[];
  persistKey?: string; // opt-in only
}
```

Contract guarantees:
- Modes are mutually exclusive (`mode` is single-value).
- Route scope resets mode by default on pathname change.
- Escape resets to default mode outside modal/dialog context.
- No persistence unless `persistKey` is provided explicitly.

## `useInteractionMode`

```ts
function useInteractionMode(): InteractionModeContextValue;
function getInteractionModeLabel(mode: InteractionMode): string;
```

## `InteractionModeToggle`

```ts
interface InteractionModeToggleProps {
  modes?: readonly InteractionMode[];
  includeView?: boolean; // default true
  ariaLabel?: string;
  labels?: Partial<Record<InteractionMode, string>>;
  singleModeLabels?: { activate: string; deactivate: string };
}
```

Usage modes:
- segmented (`view/manage/bulk`)
- single-toggle button (`customize` only)

## `ModeRibbon`

```ts
interface ModeRibbonProps {
  descriptions?: Partial<Record<InteractionMode, string>>;
  actions?: ReactNode;
  showInViewMode?: boolean; // default false
  dismissLabel?: string; // default "Return to view"
}
```

Purpose:
- compact contextual mode surface
- no large vertical control panel injection

## Optional `InteractionModeSidePanel`

```ts
interface InteractionModeSidePanelProps {
  modes: readonly InteractionMode[];
  title: string;
  description?: string;
  side?: "left" | "right" | "top" | "bottom";
  children: ReactNode;
}
```

Purpose:
- house dense mode controls in a side drawer to avoid primary layout reflow.

## Lifecycle Rules

1. Route change:
   - mode resets to provider default (`view` unless overridden).
2. Logout/session switch:
   - mode resets through provider `resetKeys` (`user.id` in `AppLayout`).
3. Escape:
   - resets to default mode when not inside a dialog.
4. Accessibility:
   - mode change controls expose labels
   - mode status is announced via `ModeRibbon` (`role="status"`, `aria-live="polite"`).

## Layout Contract

1. Mode toggle lives in `PageHeader` actions region.
2. Avoid route-level large mode panels that add major vertical shift.
3. Prefer:
   - inline controls within active widgets/sections
   - compact `ModeRibbon`
   - optional side panel for dense controls
4. Customize mode must render tile canvas in the same grid footprint as view mode.
5. Global actions (`reset`, `restore hidden`) stay outside the grid (`ModeRibbon` / side panel).

## Migration Strategy

Order:
1. Dashboard:
   - replace local `isLayoutEditing` with `useInteractionMode().is("customize")`
   - move mode toggle into `PageHeader`
   - replace large edit-mode panel with compact `ModeRibbon`
   - add non-breaking migration from legacy widget order/span to `LayoutState`
   - keep dual-write compatibility:
     - primary key: `hrms.ui.dashboard.layout.{user}.{role}`
     - legacy keys still updated: widget order + span
2. Admin:
   - add shared mode toggle (`view/manage/bulk`) in `PageHeader`
   - add `ModeRibbon` for contextual mode status
3. Next modules (planned):
   - Leave (`manage` / `bulk`)
   - Employees (`manage` / `bulk`)
   - Payroll and Notifications (`manage` where applicable)

Backward compatibility:
1. Read new layout key first.
2. If missing, derive layout from legacy order/span and seed new key.
3. Continue writing legacy keys during rollout window.
4. Remove legacy writes only after all consumers are migrated.

## Governance and Enforcement

Code review guardrails:
1. New page-level mode state must use `useInteractionMode`.
2. Do not introduce new local `isEditing` / `isBulkMode` / `isManageMode` booleans for route-level interactions.
3. Mode controls must be header-scoped (`PageHeader` actions).
4. Large top-of-page mode panels are disallowed; use `ModeRibbon` or side panel.

Lint guardrails:
- continue TypeScript + ESLint compile checks
- enforce mode policy via PR checklist and reviewer gate in this phase
- reject new route-level layout editors that do not use `EditableCanvas` + `LayoutState`

## Risk Assessment

1. Risk: mode reset unexpectedly during navigation.
   - Mitigation: route-scoped provider reset is explicit and deterministic.
2. Risk: keyboard Escape conflicts with dialogs.
   - Mitigation: provider ignores Escape reset when event target is within dialog.
3. Risk: hidden/local dependencies on previous local mode state.
   - Mitigation: migrate route-by-route, keep function signatures unchanged.
4. Risk: layout instability during mode toggles.
   - Mitigation: compact ribbon + inline controls; avoid large injected blocks.
5. Risk: legacy preference incompatibility.
   - Mitigation: dual-write strategy (new layout key + legacy keys), read-fallback migration.

## Regression Mitigation

Mandatory checks after each migration:
1. `npm run lint -- --quiet`
2. `npm run test`
3. `npm run build`
4. manual keyboard pass:
   - toggle mode using keyboard
   - navigate to another route and verify reset
   - open dialogs and verify Escape closes dialog without unintended mode resets
5. verify `customize -> view` does not introduce significant scroll jumps

## Accessibility Checklist

1. All mode toggles have descriptive labels.
2. `ModeRibbon` announces active non-view mode.
3. Focus remains visible for mode controls.
4. Escape key does not break dialog close behavior.
5. Tab order remains logical from header actions into content.

## Success Metrics

1. 100% of route-level mode state uses `InteractionModeProvider` + `useInteractionMode`.
2. 0 cross-page mode bleed (verified by route-navigation checks).
3. 0 large top-level mode panels added after this phase.
4. Dashboard + Admin migrated with no logic/RBAC behavior drift.
5. 100% of customizable layout screens use `LayoutState {x,y,w,h}` model.
