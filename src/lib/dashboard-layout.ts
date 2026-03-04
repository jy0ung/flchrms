/**
 * Dashboard layout types, defaults builder, and utility functions.
 *
 * Position compaction is handled by react-grid-layout at render time.
 * This module owns the persistent data model and role-aware defaults.
 */
import { type AppRole } from '@/types/hrms';

export const SUPPORTED_DASHBOARD_LAYOUT_VERSION = 2;
export const GRID_COLUMNS = 12;

// ── Widget ID union ──────────────────────────────────────────────

export type DashboardWidgetId =
  | 'attendanceToday'
  | 'leaveBalance'
  | 'announcements'
  | 'trainingSummary'
  | 'performanceSummary'
  | 'teamSnapshot'
  | 'onLeaveToday'
  | 'criticalInsights'
  | 'executiveMetrics'
  | 'charts'
  | 'calendarPreview'
  | 'recentActivity'
  | 'pendingActions';

// ── Tier / resize rules ──────────────────────────────────────────

export type DashboardTier = 'primary' | 'secondary' | 'supporting';

export interface ResizeRule {
  minW: number;
  maxW: number;
  step: number;
}

export const TIER_WIDTH_RULES: Record<DashboardTier, ResizeRule> = {
  primary: { minW: 3, maxW: 12, step: 1 },
  secondary: { minW: 4, maxW: 12, step: 1 },
  supporting: { minW: 4, maxW: 12, step: 1 },
};

// ── Widget definition ────────────────────────────────────────────

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  defaultTier: DashboardTier;
  allowedRoles: AppRole[];
  defaultW: number;
  defaultH: number;
  minW: number;
  maxW: number;
}

export type DashboardDefinitionMap = Record<DashboardWidgetId, DashboardWidgetDefinition>;

// ── Layout state types ───────────────────────────────────────────

export interface DashboardLayoutWidgetV2 {
  id: DashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export interface DashboardLayoutStateV2 {
  version: 2;
  presetVersion: number;
  role: AppRole;
  widgets: DashboardLayoutWidgetV2[];
}

// ── Type guard ───────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isDashboardLayoutStateV2(value: unknown): value is DashboardLayoutStateV2 {
  if (!isRecord(value)) return false;
  if (value.version !== SUPPORTED_DASHBOARD_LAYOUT_VERSION) return false;
  if (!Number.isFinite(Number(value.presetVersion))) return false;
  if (typeof value.role !== 'string') return false;
  if (!Array.isArray(value.widgets)) return false;

  return value.widgets.every((item) => {
    if (!isRecord(item)) return false;
    return (
      typeof item.id === 'string' &&
      Number.isFinite(Number(item.x)) &&
      Number.isFinite(Number(item.y)) &&
      Number.isFinite(Number(item.w)) &&
      Number.isFinite(Number(item.h)) &&
      typeof item.visible === 'boolean'
    );
  });
}

// ── Width clamping ───────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function clampWidgetWidthByTier(
  width: number,
  tier: DashboardTier,
  rulesByTier: Record<DashboardTier, ResizeRule> = TIER_WIDTH_RULES,
): number {
  const rule = rulesByTier[tier];
  const rawWidth = clamp(Math.round(width), 1, GRID_COLUMNS);
  return clamp(rawWidth, rule.minW, rule.maxW);
}

// ── Normalize a layout state ─────────────────────────────────────
//
// Ensures every role-allowed widget has an entry. Does NOT compact
// positions — react-grid-layout handles visual compaction at render.

export function normalizeDashboardLayoutStateV2(params: {
  state: DashboardLayoutStateV2;
  definitions: DashboardDefinitionMap;
  role: AppRole;
  presetVersion: number;
}): DashboardLayoutStateV2 {
  const { state, definitions, role, presetVersion } = params;
  const seen = new Map<DashboardWidgetId, DashboardLayoutWidgetV2>();

  for (const widget of state.widgets) {
    const def = definitions[widget.id];
    if (!def) continue;
    if (!def.allowedRoles.includes(role)) continue;
    if (seen.has(widget.id)) continue; // deduplicate

    seen.set(widget.id, {
      id: widget.id,
      x: Math.max(0, Math.round(widget.x)),
      y: Math.max(0, Math.round(widget.y)),
      w: clampWidgetWidthByTier(widget.w, def.defaultTier),
      h: Math.max(1, Math.round(widget.h)),
      visible: typeof widget.visible === 'boolean' ? widget.visible : true,
    });
  }

  // Seed missing widgets as hidden
  for (const def of Object.values(definitions)) {
    if (!def.allowedRoles.includes(role)) continue;
    if (seen.has(def.id)) continue;
    seen.set(def.id, {
      id: def.id,
      x: 0,
      y: 0,
      w: clampWidgetWidthByTier(def.defaultW, def.defaultTier),
      h: Math.max(1, def.defaultH),
      visible: false,
    });
  }

  return {
    version: SUPPORTED_DASHBOARD_LAYOUT_VERSION,
    presetVersion,
    role,
    widgets: [...seen.values()],
  };
}

// ── Build defaults from role config ──────────────────────────────

export function buildDefaultDashboardLayoutV2(params: {
  definitions: DashboardDefinitionMap;
  role: AppRole;
  presetVersion: number;
  orderedWidgetIds: DashboardWidgetId[];
}): DashboardLayoutStateV2 {
  const { definitions, role, presetVersion, orderedWidgetIds } = params;
  const allowed = orderedWidgetIds.filter(
    (id) => definitions[id]?.allowedRoles.includes(role),
  );

  // Lay out visible widgets in a simple left-to-right, top-to-bottom flow
  const widgets: DashboardLayoutWidgetV2[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowMaxH = 0;

  for (const id of allowed) {
    const def = definitions[id];
    const w = clampWidgetWidthByTier(def.defaultW, def.defaultTier);
    const h = Math.max(1, def.defaultH);

    // Wrap to next row if widget doesn't fit
    if (cursorX + w > GRID_COLUMNS) {
      cursorX = 0;
      cursorY += rowMaxH;
      rowMaxH = 0;
    }

    widgets.push({ id, x: cursorX, y: cursorY, w, h, visible: true });
    cursorX += w;
    rowMaxH = Math.max(rowMaxH, h);
  }

  // Add hidden widgets for role-allowed but not in default order
  const visibleSet = new Set(allowed);
  for (const def of Object.values(definitions)) {
    if (!def.allowedRoles.includes(role)) continue;
    if (visibleSet.has(def.id)) continue;
    widgets.push({
      id: def.id,
      x: 0,
      y: 0,
      w: clampWidgetWidthByTier(def.defaultW, def.defaultTier),
      h: Math.max(1, def.defaultH),
      visible: false,
    });
  }

  return {
    version: SUPPORTED_DASHBOARD_LAYOUT_VERSION,
    presetVersion,
    role,
    widgets,
  };
}
