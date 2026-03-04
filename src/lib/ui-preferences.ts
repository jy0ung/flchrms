/**
 * UI Preferences — localStorage persistence for dashboard layout,
 * floating notifications, admin stats, and leave display settings.
 */
import {
  isDashboardLayoutStateV2,
  type DashboardLayoutStateV2,
} from '@/lib/dashboard-layout';

export const FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY = 'hrms.ui.floatingNotifications.visible';
export const UI_PREFERENCES_CHANGED_EVENT = 'hrms:ui-preferences-changed';

const DASHBOARD_WIDGET_LAYOUT_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.layout';
const DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.widgets';
const DASHBOARD_WIDGET_SPANS_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.widgetSpans';
const ADMIN_STATS_CARDS_STORAGE_KEY_PREFIX = 'hrms.ui.admin.stats.cards';
const ADMIN_STATS_LAYOUT_STORAGE_KEY_PREFIX = 'hrms.ui.admin.stats.layout';

// ── Helpers ──────────────────────────────────────────────────────

function dispatchPrefsEvent(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(UI_PREFERENCES_CHANGED_EVENT, { detail: { key, value } }),
  );
}

// ── Floating Notifications ───────────────────────────────────────

export function getFloatingNotificationsVisible(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY) !== '0';
}

export function setFloatingNotificationsVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY, visible ? '1' : '0');
  dispatchPrefsEvent('floatingNotificationsVisible', visible);
}

// ── Dashboard Layout V2 ─────────────────────────────────────────

function dashboardLayoutKey(userId: string, role: string) {
  return `${DASHBOARD_WIDGET_LAYOUT_STORAGE_KEY_PREFIX}.${userId}.${role}`;
}

export function getDashboardLayoutStateV2(userId: string, role: string): DashboardLayoutStateV2 | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(dashboardLayoutKey(userId, role));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isDashboardLayoutStateV2(parsed)) return null;
    if (parsed.role !== role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDashboardLayoutStateV2(userId: string, role: string, state: DashboardLayoutStateV2): void {
  if (typeof window === 'undefined') return;
  const key = dashboardLayoutKey(userId, role);
  window.localStorage.setItem(key, JSON.stringify(state));
  dispatchPrefsEvent(key, state);
}

export function resetDashboardWidgetLayoutState(userId: string, role: string): void {
  if (typeof window === 'undefined') return;
  const key = dashboardLayoutKey(userId, role);
  window.localStorage.removeItem(key);
  dispatchPrefsEvent(key, null);
}

// Legacy key cleanup (V1 keys that may still exist)

export function resetDashboardEnabledWidgetIds(userId: string, role: string): void {
  if (typeof window === 'undefined') return;
  const key = `${DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.removeItem(key);
}

export function resetDashboardWidgetSpanMap(userId: string, role: string): void {
  if (typeof window === 'undefined') return;
  const key = `${DASHBOARD_WIDGET_SPANS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.removeItem(key);
}

// ── Admin Stats ──────────────────────────────────────────────────

export function getAdminStatsEnabledCardIds(
  userId: string,
  role: string,
  allowedCardIds: string[],
  defaultCardIds: string[],
): string[] {
  if (typeof window === 'undefined') return defaultCardIds;
  const raw = window.localStorage.getItem(`${ADMIN_STATS_CARDS_STORAGE_KEY_PREFIX}.${userId}.${role}`);
  if (!raw) return defaultCardIds;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultCardIds;
    const allowedSet = new Set(allowedCardIds);
    const filtered = [...new Set(parsed.filter((id): id is string => typeof id === 'string'))].filter((id) => allowedSet.has(id));
    return filtered.length > 0 ? filtered : defaultCardIds;
  } catch {
    return defaultCardIds;
  }
}

export function setAdminStatsEnabledCardIds(userId: string, role: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  const key = `${ADMIN_STATS_CARDS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.setItem(key, JSON.stringify(ids));
  dispatchPrefsEvent(key, ids);
}

export function resetAdminStatsEnabledCardIds(userId: string, role: string): void {
  if (typeof window === 'undefined') return;
  const key = `${ADMIN_STATS_CARDS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.removeItem(key);
  dispatchPrefsEvent(key, null);
}

/** Minimal layout state for admin stats cards (localStorage only). */
export interface AdminStatsLayoutState {
  version: number;
  items: Array<{ id: string; x: number; y: number; w: number; h: number }>;
}

export function getAdminStatsLayoutState(userId: string, role: string): AdminStatsLayoutState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(`${ADMIN_STATS_LAYOUT_STORAGE_KEY_PREFIX}.${userId}.${role}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminStatsLayoutState> | null;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) return null;
    return { version: Number(parsed.version ?? 1), items: parsed.items };
  } catch {
    return null;
  }
}

export function setAdminStatsLayoutState(userId: string, role: string, state: AdminStatsLayoutState): void {
  if (typeof window === 'undefined') return;
  const key = `${ADMIN_STATS_LAYOUT_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.setItem(key, JSON.stringify(state));
  dispatchPrefsEvent(key, state);
}

export function resetAdminStatsLayoutState(userId: string, role: string): void {
  if (typeof window === 'undefined') return;
  const key = `${ADMIN_STATS_LAYOUT_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.removeItem(key);
  dispatchPrefsEvent(key, null);
}

// ── Leave Display Preferences ────────────────────────────────────
const LEAVE_DISPLAY_PREFS_STORAGE_KEY_PREFIX = 'hrms.ui.leave.displayPrefs';

export interface LeaveDisplayPrefs {
  visibleIds: string[];
}

export function getLeaveDisplayPrefs(
  userId: string,
  role: string,
  allLeaveTypeIds: string[],
): LeaveDisplayPrefs {
  if (typeof window === 'undefined') return { visibleIds: allLeaveTypeIds };
  const raw = window.localStorage.getItem(`${LEAVE_DISPLAY_PREFS_STORAGE_KEY_PREFIX}.${userId}.${role}`);
  if (!raw) return { visibleIds: allLeaveTypeIds };
  try {
    const parsed = JSON.parse(raw) as Partial<LeaveDisplayPrefs> | null;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.visibleIds)) return { visibleIds: allLeaveTypeIds };
    const known = new Set(allLeaveTypeIds);
    return { visibleIds: parsed.visibleIds.filter((id): id is string => typeof id === 'string' && known.has(id)) };
  } catch {
    return { visibleIds: allLeaveTypeIds };
  }
}

export function setLeaveDisplayPrefs(userId: string, role: string, prefs: LeaveDisplayPrefs): void {
  if (typeof window === 'undefined') return;
  const key = `${LEAVE_DISPLAY_PREFS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.setItem(key, JSON.stringify(prefs));
  dispatchPrefsEvent(key, prefs);
}

export function resetLeaveDisplayPrefs(userId: string, role: string): void {
  if (typeof window === 'undefined') return;
  const key = `${LEAVE_DISPLAY_PREFS_STORAGE_KEY_PREFIX}.${userId}.${role}`;
  window.localStorage.removeItem(key);
  dispatchPrefsEvent(key, null);
}
