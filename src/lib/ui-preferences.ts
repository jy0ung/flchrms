import { EDITABLE_LAYOUT_VERSION, type LayoutState } from '@/lib/editable-layout';
import {
  isDashboardLayoutStateV2,
  type DashboardLayoutStateV2,
} from '@/lib/dashboard-layout';

export const FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY = 'hrms.ui.floatingNotifications.visible';
export const UI_PREFERENCES_CHANGED_EVENT = 'hrms:ui-preferences-changed';
const DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.widgets';
const DASHBOARD_WIDGET_SPANS_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.widgetSpans';
const DASHBOARD_WIDGET_LAYOUT_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.layout';
const DASHBOARD_LAYOUT_PRESET_VERSION_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.layoutPresetVersion';
const ADMIN_STATS_CARDS_STORAGE_KEY_PREFIX = 'hrms.ui.admin.stats.cards';
const ADMIN_STATS_LAYOUT_STORAGE_KEY_PREFIX = 'hrms.ui.admin.stats.layout';

export function getFloatingNotificationsVisible(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY) !== '0';
}

export function setFloatingNotificationsVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY, visible ? '1' : '0');
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: 'floatingNotificationsVisible', value: visible },
    }),
  );
}

function getDashboardWidgetsStorageKey(userId: string, role: string) {
  return `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

function getDashboardWidgetSpansStorageKey(userId: string, role: string) {
  return `${DASHBOARD_WIDGET_SPANS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

function getDashboardWidgetLayoutStorageKey(userId: string, role: string) {
  return `${DASHBOARD_WIDGET_LAYOUT_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

function getDashboardLayoutPresetVersionStorageKey(userId: string, role: string) {
  return `${DASHBOARD_LAYOUT_PRESET_VERSION_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

function getAdminStatsCardsStorageKey(userId: string, role: string) {
  return `${ADMIN_STATS_CARDS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

function getAdminStatsLayoutStorageKey(userId: string, role: string) {
  return `${ADMIN_STATS_LAYOUT_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

function parseLayoutState(raw: string | null): LayoutState | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LayoutState> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.items)) return null;

    const items = parsed.items
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const layoutItem = item as Record<string, unknown>;
        return {
          id: String(layoutItem.id ?? ''),
          x: Number(layoutItem.x ?? 0),
          y: Number(layoutItem.y ?? 0),
          w: Number(layoutItem.w ?? 1),
          h: Number(layoutItem.h ?? 1),
        };
      })
      .filter((item) => item.id.length > 0 && Number.isFinite(item.x) && Number.isFinite(item.y) && Number.isFinite(item.w) && Number.isFinite(item.h));

    return {
      version: typeof parsed.version === 'number' ? parsed.version : EDITABLE_LAYOUT_VERSION,
      items,
    };
  } catch {
    return null;
  }
}

function parseDashboardLayoutStateV2(raw: string | null): DashboardLayoutStateV2 | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isDashboardLayoutStateV2(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseStoredVersion(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<{ version: unknown }> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const version = Number(parsed.version);
    if (!Number.isFinite(version)) return null;
    return Math.round(version);
  } catch {
    return null;
  }
}

export function getDashboardEnabledWidgetIds(
  userId: string,
  role: string,
  allowedWidgetIds: string[],
  defaultWidgetIds: string[],
): string[] {
  if (typeof window === 'undefined') return defaultWidgetIds;

  const storageKey = getDashboardWidgetsStorageKey(userId, role);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return defaultWidgetIds;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultWidgetIds;

    const allowedSet = new Set(allowedWidgetIds);
    const unique = [...new Set(parsed.filter((id): id is string => typeof id === 'string'))];
    const filtered = unique.filter((id) => allowedSet.has(id));

    return filtered.length > 0 ? filtered : defaultWidgetIds;
  } catch {
    return defaultWidgetIds;
  }
}

export function setDashboardEnabledWidgetIds(userId: string, role: string, enabledWidgetIds: string[]): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardWidgetsStorageKey(userId, role);
  window.localStorage.setItem(storageKey, JSON.stringify(enabledWidgetIds));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: enabledWidgetIds },
    }),
  );
}

export function resetDashboardEnabledWidgetIds(userId: string, role: string): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardWidgetsStorageKey(userId, role);
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: null },
    }),
  );
}

export function getDashboardWidgetSpanMap(
  userId: string,
  role: string,
  allowedWidgetIds: string[],
  defaultSpanById: Record<string, number>,
): Record<string, number> {
  if (typeof window === 'undefined') return { ...defaultSpanById };

  const storageKey = getDashboardWidgetSpansStorageKey(userId, role);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return { ...defaultSpanById };

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...defaultSpanById };

    const allowed = new Set(allowedWidgetIds);
    const next: Record<string, number> = {};
    for (const [widgetId, fallbackSpan] of Object.entries(defaultSpanById)) {
      if (!allowed.has(widgetId)) continue;
      const rawValue = (parsed as Record<string, unknown>)[widgetId];
      const normalized = typeof rawValue === 'number' ? Math.round(rawValue) : fallbackSpan;
      next[widgetId] = normalized >= 1 && normalized <= 3 ? normalized : fallbackSpan;
    }

    return next;
  } catch {
    return { ...defaultSpanById };
  }
}

export function setDashboardWidgetSpanMap(userId: string, role: string, spanMap: Record<string, number>): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardWidgetSpansStorageKey(userId, role);
  window.localStorage.setItem(storageKey, JSON.stringify(spanMap));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: spanMap },
    }),
  );
}

export function resetDashboardWidgetSpanMap(userId: string, role: string): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardWidgetSpansStorageKey(userId, role);
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: null },
    }),
  );
}

export function getDashboardWidgetLayoutState(userId: string, role: string): LayoutState | null {
  if (typeof window === 'undefined') return null;
  const storageKey = getDashboardWidgetLayoutStorageKey(userId, role);
  return parseLayoutState(window.localStorage.getItem(storageKey));
}

export function getDashboardLayoutStateV2(userId: string, role: string): DashboardLayoutStateV2 | null {
  if (typeof window === 'undefined') return null;
  const storageKey = getDashboardWidgetLayoutStorageKey(userId, role);
  const parsed = parseDashboardLayoutStateV2(window.localStorage.getItem(storageKey));
  if (!parsed) return null;
  if (parsed.role !== role) return null;
  return parsed;
}

export function setDashboardLayoutStateV2(userId: string, role: string, layoutState: DashboardLayoutStateV2): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardWidgetLayoutStorageKey(userId, role);
  window.localStorage.setItem(storageKey, JSON.stringify(layoutState));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: layoutState },
    }),
  );
}

export function getDashboardStoredLayoutVersion(userId: string, role: string): number | null {
  if (typeof window === 'undefined') return null;
  const storageKey = getDashboardWidgetLayoutStorageKey(userId, role);
  return parseStoredVersion(window.localStorage.getItem(storageKey));
}

export function setDashboardWidgetLayoutState(userId: string, role: string, layoutState: LayoutState): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardWidgetLayoutStorageKey(userId, role);
  window.localStorage.setItem(storageKey, JSON.stringify(layoutState));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: layoutState },
    }),
  );
}

export function resetDashboardWidgetLayoutState(userId: string, role: string): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardWidgetLayoutStorageKey(userId, role);
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: null },
    }),
  );
}

export function getDashboardLayoutPresetVersion(userId: string, role: string): number | null {
  if (typeof window === 'undefined') return null;

  const storageKey = getDashboardLayoutPresetVersionStorageKey(userId, role);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function setDashboardLayoutPresetVersion(userId: string, role: string, version: number): void {
  if (typeof window === 'undefined') return;

  const storageKey = getDashboardLayoutPresetVersionStorageKey(userId, role);
  window.localStorage.setItem(storageKey, String(version));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: version },
    }),
  );
}

export function getAdminStatsEnabledCardIds(
  userId: string,
  role: string,
  allowedCardIds: string[],
  defaultCardIds: string[],
): string[] {
  if (typeof window === 'undefined') return defaultCardIds;

  const storageKey = getAdminStatsCardsStorageKey(userId, role);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return defaultCardIds;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultCardIds;

    const allowedSet = new Set(allowedCardIds);
    const unique = [...new Set(parsed.filter((id): id is string => typeof id === 'string'))];
    const filtered = unique.filter((id) => allowedSet.has(id));

    if (unique.length > 0 && filtered.length === 0) {
      return defaultCardIds;
    }

    return filtered;
  } catch {
    return defaultCardIds;
  }
}

export function setAdminStatsEnabledCardIds(userId: string, role: string, enabledCardIds: string[]): void {
  if (typeof window === 'undefined') return;

  const storageKey = getAdminStatsCardsStorageKey(userId, role);
  window.localStorage.setItem(storageKey, JSON.stringify(enabledCardIds));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: enabledCardIds },
    }),
  );
}

export function resetAdminStatsEnabledCardIds(userId: string, role: string): void {
  if (typeof window === 'undefined') return;

  const storageKey = getAdminStatsCardsStorageKey(userId, role);
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: null },
    }),
  );
}

export function getAdminStatsLayoutState(userId: string, role: string): LayoutState | null {
  if (typeof window === 'undefined') return null;
  const storageKey = getAdminStatsLayoutStorageKey(userId, role);
  return parseLayoutState(window.localStorage.getItem(storageKey));
}

export function setAdminStatsLayoutState(userId: string, role: string, layoutState: LayoutState): void {
  if (typeof window === 'undefined') return;

  const storageKey = getAdminStatsLayoutStorageKey(userId, role);
  window.localStorage.setItem(storageKey, JSON.stringify(layoutState));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: layoutState },
    }),
  );
}

export function resetAdminStatsLayoutState(userId: string, role: string): void {
  if (typeof window === 'undefined') return;

  const storageKey = getAdminStatsLayoutStorageKey(userId, role);
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: null },
    }),
  );
}

// ── Leave Display Preferences ────────────────────────────────────
const LEAVE_DISPLAY_PREFS_STORAGE_KEY_PREFIX = 'hrms.ui.leave.displayPrefs';

export interface LeaveDisplayPrefs {
  /** Ordered array of leave type IDs the user wants visible. */
  visibleIds: string[];
}

function getLeaveDisplayPrefsStorageKey(userId: string, role: string) {
  return `${LEAVE_DISPLAY_PREFS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

/**
 * Read the user's leave-display preferences from localStorage.
 * Falls back to `allLeaveTypeIds` (i.e. show everything) when no prefs are stored.
 */
export function getLeaveDisplayPrefs(
  userId: string,
  role: string,
  allLeaveTypeIds: string[],
): LeaveDisplayPrefs {
  if (typeof window === 'undefined') return { visibleIds: allLeaveTypeIds };

  const storageKey = getLeaveDisplayPrefsStorageKey(userId, role);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return { visibleIds: allLeaveTypeIds };

  try {
    const parsed = JSON.parse(raw) as Partial<LeaveDisplayPrefs> | null;
    if (!parsed || typeof parsed !== 'object') return { visibleIds: allLeaveTypeIds };
    if (!Array.isArray(parsed.visibleIds)) return { visibleIds: allLeaveTypeIds };

    const known = new Set(allLeaveTypeIds);
    const filtered = parsed.visibleIds.filter(
      (id): id is string => typeof id === 'string' && known.has(id),
    );

    return { visibleIds: filtered };
  } catch {
    return { visibleIds: allLeaveTypeIds };
  }
}

/** Persist the user's leave-display preferences to localStorage. */
export function setLeaveDisplayPrefs(
  userId: string,
  role: string,
  prefs: LeaveDisplayPrefs,
): void {
  if (typeof window === 'undefined') return;

  const storageKey = getLeaveDisplayPrefsStorageKey(userId, role);
  window.localStorage.setItem(storageKey, JSON.stringify(prefs));
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: prefs },
    }),
  );
}

/** Remove the user's leave-display preferences (reset to defaults). */
export function resetLeaveDisplayPrefs(userId: string, role: string): void {
  if (typeof window === 'undefined') return;

  const storageKey = getLeaveDisplayPrefsStorageKey(userId, role);
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, {
      detail: { key: storageKey, value: null },
    }),
  );
}
