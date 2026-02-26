export const FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY = 'hrms.ui.floatingNotifications.visible';
export const UI_PREFERENCES_CHANGED_EVENT = 'hrms:ui-preferences-changed';

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

