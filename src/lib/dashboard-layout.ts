import { type AppRole } from '@/types/hrms';
import {
  EDITABLE_LAYOUT_COLUMNS,
  compactLayoutItems,
  type LayoutDimensionsById,
  type LayoutItem,
} from '@/lib/editable-layout';

export const SUPPORTED_DASHBOARD_LAYOUT_VERSION = 2;

export type DashboardWidgetId =
  | 'attendanceToday'
  | 'leaveBalance'
  | 'announcements'
  | 'trainingSummary'
  | 'performanceSummary'
  | 'teamSnapshot'
  | 'onLeaveToday'
  | 'criticalInsights'
  | 'executiveMetrics';

export type DashboardTier = 'primary' | 'secondary' | 'supporting';

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  defaultTier: DashboardTier;
  allowedRoles: AppRole[];
  defaultW: number;
  defaultH: number;
  minW: number;
  maxW: number;
}

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

export type DashboardDefinitionMap = Record<DashboardWidgetId, DashboardWidgetDefinition>;

const DASHBOARD_TIERS: DashboardTier[] = ['primary', 'secondary', 'supporting'];

const DEFAULT_LAYOUT_ITEM: Omit<DashboardLayoutWidgetV2, 'id'> = {
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  visible: true,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFinite(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
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

export function clampWidgetWidthByTier(
  width: number,
  tier: DashboardTier,
  rulesByTier: Record<DashboardTier, ResizeRule> = TIER_WIDTH_RULES,
): number {
  const rule = rulesByTier[tier];
  const safeStep = Math.max(1, Math.round(rule.step || 1));
  const rawWidth = clamp(Math.round(width), 1, EDITABLE_LAYOUT_COLUMNS);
  const clamped = clamp(rawWidth, rule.minW, rule.maxW);
  const snapped = rule.minW + Math.round((clamped - rule.minW) / safeStep) * safeStep;
  return clamp(snapped, rule.minW, rule.maxW);
}

export function compactLaneWidgets(
  widgets: DashboardLayoutWidgetV2[],
  tier: DashboardTier,
  rulesByTier: Record<DashboardTier, ResizeRule> = TIER_WIDTH_RULES,
): DashboardLayoutWidgetV2[] {
  const visible = widgets.filter((widget) => widget.visible);
  if (visible.length === 0) return [];

  const laneItems: LayoutItem[] = visible.map((widget) => ({
    id: widget.id,
    x: clamp(Math.round(widget.x), 0, EDITABLE_LAYOUT_COLUMNS - 1),
    y: Math.max(0, Math.round(widget.y)),
    w: clampWidgetWidthByTier(widget.w, tier, rulesByTier),
    h: Math.max(1, Math.round(widget.h)),
  }));

  const compacted = compactLayoutItems(laneItems, EDITABLE_LAYOUT_COLUMNS);
  return compacted.map((item) => ({
    id: item.id as DashboardWidgetId,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    visible: true,
  }));
}

export function splitLayoutByLane(
  layoutState: DashboardLayoutStateV2,
  definitions: DashboardDefinitionMap,
): Record<DashboardTier, DashboardLayoutWidgetV2[]> {
  const result: Record<DashboardTier, DashboardLayoutWidgetV2[]> = {
    primary: [],
    secondary: [],
    supporting: [],
  };

  for (const widget of layoutState.widgets) {
    const definition = definitions[widget.id];
    if (!definition) continue;
    result[definition.defaultTier].push(widget);
  }

  for (const tier of DASHBOARD_TIERS) {
    result[tier] = [...result[tier]].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  }

  return result;
}

export function mergeLanesToLayout(
  lanes: Partial<Record<DashboardTier, DashboardLayoutWidgetV2[]>>,
  role: AppRole,
  presetVersion: number,
): DashboardLayoutStateV2 {
  const widgets: DashboardLayoutWidgetV2[] = [];

  for (const tier of DASHBOARD_TIERS) {
    const laneWidgets = lanes[tier] ?? [];
    for (const widget of laneWidgets) {
      widgets.push({ ...widget });
    }
  }

  return {
    version: SUPPORTED_DASHBOARD_LAYOUT_VERSION,
    presetVersion,
    role,
    widgets,
  };
}

export function normalizeDashboardLayoutStateV2(params: {
  state: DashboardLayoutStateV2;
  definitions: DashboardDefinitionMap;
  role: AppRole;
  presetVersion: number;
  rulesByTier?: Record<DashboardTier, ResizeRule>;
}): DashboardLayoutStateV2 {
  const { state, definitions, role, presetVersion, rulesByTier = TIER_WIDTH_RULES } = params;
  const dedupedById = new Map<DashboardWidgetId, DashboardLayoutWidgetV2>();

  for (const widget of state.widgets) {
    const definition = definitions[widget.id];
    if (!definition) continue;
    if (!definition.allowedRoles.includes(role)) continue;

    const tier = definition.defaultTier;
    dedupedById.set(widget.id, {
      id: widget.id,
      x: Math.max(0, Math.round(normalizeFinite(widget.x, 0))),
      y: Math.max(0, Math.round(normalizeFinite(widget.y, 0))),
      w: clampWidgetWidthByTier(normalizeFinite(widget.w, definition.defaultW), tier, rulesByTier),
      h: Math.max(1, Math.round(normalizeFinite(widget.h, definition.defaultH))),
      visible: normalizeBoolean(widget.visible, true),
    });
  }

  for (const definition of Object.values(definitions)) {
    if (!definition.allowedRoles.includes(role)) continue;
    if (dedupedById.has(definition.id)) continue;
    dedupedById.set(definition.id, {
      id: definition.id,
      ...DEFAULT_LAYOUT_ITEM,
      w: clampWidgetWidthByTier(definition.defaultW, definition.defaultTier, rulesByTier),
      h: Math.max(1, definition.defaultH),
    });
  }

  const seededState: DashboardLayoutStateV2 = {
    version: SUPPORTED_DASHBOARD_LAYOUT_VERSION,
    presetVersion,
    role,
    widgets: [...dedupedById.values()],
  };

  const laneSplit = splitLayoutByLane(seededState, definitions);
  const compactedLanes: Partial<Record<DashboardTier, DashboardLayoutWidgetV2[]>> = {};

  for (const tier of DASHBOARD_TIERS) {
    const laneWidgets = laneSplit[tier];
    const visibleLane = laneWidgets.filter((widget) => widget.visible);
    const compactedVisible = compactLaneWidgets(visibleLane, tier, rulesByTier);
    const compactedById = new Map(compactedVisible.map((widget) => [widget.id, widget]));

    compactedLanes[tier] = laneWidgets.map((widget) => {
      if (!widget.visible) {
        return { ...widget, x: 0, y: 0 };
      }
      const compacted = compactedById.get(widget.id);
      if (!compacted) return widget;
      return { ...widget, x: compacted.x, y: compacted.y, w: compacted.w, h: compacted.h };
    });
  }

  const next = mergeLanesToLayout(compactedLanes, role, presetVersion);
  assertDashboardLayoutInvariants(next, definitions, rulesByTier);
  return next;
}

export function buildDefaultDashboardLayoutV2(params: {
  definitions: DashboardDefinitionMap;
  role: AppRole;
  presetVersion: number;
  orderedWidgetIds: DashboardWidgetId[];
  defaultDimensionsById?: Partial<LayoutDimensionsById>;
  rulesByTier?: Record<DashboardTier, ResizeRule>;
}): DashboardLayoutStateV2 {
  const {
    definitions,
    role,
    presetVersion,
    orderedWidgetIds,
    defaultDimensionsById,
    rulesByTier = TIER_WIDTH_RULES,
  } = params;
  const included = orderedWidgetIds.filter((id) => definitions[id]?.allowedRoles.includes(role));
  const visibleSet = new Set(included);
  const laneItems: Partial<Record<DashboardTier, DashboardLayoutWidgetV2[]>> = {
    primary: [],
    secondary: [],
    supporting: [],
  };

  for (const widgetId of included) {
    const definition = definitions[widgetId];
    const tier = definition.defaultTier;
    const dims = defaultDimensionsById?.[widgetId] ?? {
      w: definition.defaultW,
      h: definition.defaultH,
    };
    laneItems[tier]!.push({
      id: widgetId,
      x: 0,
      y: laneItems[tier]!.length,
      w: clampWidgetWidthByTier(dims.w, tier, rulesByTier),
      h: Math.max(1, Math.round(dims.h)),
      visible: true,
    });
  }

  for (const tier of DASHBOARD_TIERS) {
    laneItems[tier] = compactLaneWidgets(laneItems[tier] ?? [], tier, rulesByTier);
  }

  const layout = mergeLanesToLayout(laneItems, role, presetVersion);
  const hiddenDefaults: DashboardLayoutWidgetV2[] = [];

  for (const definition of Object.values(definitions)) {
    if (!definition.allowedRoles.includes(role)) continue;
    if (visibleSet.has(definition.id)) continue;
    hiddenDefaults.push({
      id: definition.id,
      x: 0,
      y: 0,
      w: clampWidgetWidthByTier(definition.defaultW, definition.defaultTier, rulesByTier),
      h: Math.max(1, definition.defaultH),
      visible: false,
    });
  }

  const next = {
    ...layout,
    widgets: [...layout.widgets, ...hiddenDefaults],
  } satisfies DashboardLayoutStateV2;

  assertDashboardLayoutInvariants(next, definitions, rulesByTier);
  return next;
}

export function migrateLegacyDashboardLayoutToV2(params: {
  role: AppRole;
  presetVersion: number;
  definitions: DashboardDefinitionMap;
  legacyLayoutItems?: LayoutItem[] | null;
  legacyEnabledWidgetIds?: DashboardWidgetId[];
  legacyWidthById?: Partial<Record<DashboardWidgetId, number>>;
  defaultOrderedWidgetIds: DashboardWidgetId[];
  rulesByTier?: Record<DashboardTier, ResizeRule>;
}): DashboardLayoutStateV2 {
  const {
    role,
    presetVersion,
    definitions,
    legacyLayoutItems,
    legacyEnabledWidgetIds,
    legacyWidthById,
    defaultOrderedWidgetIds,
    rulesByTier = TIER_WIDTH_RULES,
  } = params;

  const roleAllowed = defaultOrderedWidgetIds.filter((id) => definitions[id]?.allowedRoles.includes(role));
  const visibleOrder = (legacyEnabledWidgetIds?.length ? legacyEnabledWidgetIds : roleAllowed)
    .filter((id) => definitions[id]?.allowedRoles.includes(role));

  const legacyItemById = new Map(
    (legacyLayoutItems ?? [])
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => [item.id as DashboardWidgetId, item]),
  );

  const defaultDimensionsById: Partial<LayoutDimensionsById> = {};
  for (const widgetId of roleAllowed) {
    const definition = definitions[widgetId];
    const legacyItem = legacyItemById.get(widgetId);
    const legacyWidth = legacyWidthById?.[widgetId] ?? legacyItem?.w;
    defaultDimensionsById[widgetId] = {
      w: typeof legacyWidth === 'number' ? legacyWidth : definition.defaultW,
      h: definition.defaultH,
    };
  }

  const baseLayout = buildDefaultDashboardLayoutV2({
    definitions,
    role,
    presetVersion,
    orderedWidgetIds: visibleOrder.length > 0 ? visibleOrder : roleAllowed,
    defaultDimensionsById,
    rulesByTier,
  });

  const visibleSet = new Set(visibleOrder);
  const withVisibility = {
    ...baseLayout,
    widgets: baseLayout.widgets.map((widget) => ({
      ...widget,
      w: clampWidgetWidthByTier(
        defaultDimensionsById[widget.id]?.w ?? widget.w,
        definitions[widget.id].defaultTier,
        rulesByTier,
      ),
      visible: visibleSet.size === 0 ? widget.visible : visibleSet.has(widget.id),
    })),
  } satisfies DashboardLayoutStateV2;

  return normalizeDashboardLayoutStateV2({
    state: withVisibility,
    definitions,
    role,
    presetVersion,
    rulesByTier,
  });
}

export function assertDashboardLayoutInvariants(
  state: DashboardLayoutStateV2,
  definitions: DashboardDefinitionMap,
  rulesByTier: Record<DashboardTier, ResizeRule> = TIER_WIDTH_RULES,
): void {
  const seen = new Set<string>();
  for (const widget of state.widgets) {
    if (seen.has(widget.id)) {
      throw new Error(`Duplicate dashboard widget id: ${widget.id}`);
    }
    seen.add(widget.id);

    const definition = definitions[widget.id];
    if (!definition) {
      throw new Error(`Unknown dashboard widget id: ${widget.id}`);
    }

    if (!Number.isInteger(widget.x) || !Number.isInteger(widget.y)) {
      throw new Error(`Dashboard widget has non-integer coordinates: ${widget.id}`);
    }
    if (widget.x < 0 || widget.y < 0) {
      throw new Error(`Dashboard widget has negative coordinates: ${widget.id}`);
    }

    const rule = rulesByTier[definition.defaultTier];
    const clamped = clampWidgetWidthByTier(widget.w, definition.defaultTier, rulesByTier);
    if (widget.w !== clamped) {
      throw new Error(`Dashboard widget width out of bounds for ${widget.id}`);
    }
    if (widget.w < rule.minW || widget.w > rule.maxW) {
      throw new Error(`Dashboard widget width violates tier constraints for ${widget.id}`);
    }
    if (widget.x + widget.w > EDITABLE_LAYOUT_COLUMNS) {
      throw new Error(`Dashboard widget exceeds grid width for ${widget.id}`);
    }
    if (widget.h < 1) {
      throw new Error(`Dashboard widget height must be >= 1 for ${widget.id}`);
    }
  }
}
