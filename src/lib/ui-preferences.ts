export const FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY = 'hrms.ui.floatingNotifications.visible';
export const UI_PREFERENCES_CHANGED_EVENT = 'hrms:ui-preferences-changed';
const DASHBOARD_WIDGETS_STORAGE_KEY_PREFIX = 'hrms.ui.dashboard.widgets';

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
