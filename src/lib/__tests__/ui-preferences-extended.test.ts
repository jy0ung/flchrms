import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getFloatingNotificationsVisible,
  setFloatingNotificationsVisible,
  resetDashboardEnabledWidgetIds,
  resetDashboardWidgetSpanMap,
  resetDashboardWidgetLayoutState,
  getDashboardLayoutStateV2,
  setDashboardLayoutStateV2,
  getAdminStatsEnabledCardIds,
  setAdminStatsEnabledCardIds,
  resetAdminStatsEnabledCardIds,
  getAdminStatsLayoutState,
  setAdminStatsLayoutState,
  resetAdminStatsLayoutState,
  getLeaveDisplayPrefs,
  setLeaveDisplayPrefs,
  resetLeaveDisplayPrefs,
  UI_PREFERENCES_CHANGED_EVENT,
} from '@/lib/ui-preferences';

const USER = 'user-001';
const ROLE = 'admin';

beforeEach(() => {
  window.localStorage.clear();
});

// ── Floating Notifications ───────────────────────────────────────
describe('floatingNotifications visibility', () => {
  it('defaults to true when nothing stored', () => {
    expect(getFloatingNotificationsVisible()).toBe(true);
  });

  it('returns false when stored as "0"', () => {
    setFloatingNotificationsVisible(false);
    expect(getFloatingNotificationsVisible()).toBe(false);
  });

  it('returns true when stored as "1"', () => {
    setFloatingNotificationsVisible(true);
    expect(getFloatingNotificationsVisible()).toBe(true);
  });

  it('dispatches custom event on set', () => {
    const spy = vi.fn();
    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
    setFloatingNotificationsVisible(false);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
  });
});

// ── Dashboard Layout V2 ─────────────────────────────────────────
describe('dashboard layout V2', () => {
  it('round-trips layout state', () => {
    const state = {
      version: 2 as const,
      presetVersion: 6,
      role: ROLE as const,
      widgets: [
        { id: 'attendanceToday' as const, x: 0, y: 0, w: 8, h: 4, visible: true },
      ],
    };
    setDashboardLayoutStateV2(USER, ROLE, state);
    expect(getDashboardLayoutStateV2(USER, ROLE)).toEqual(state);
  });

  it('resets layout state', () => {
    const state = {
      version: 2 as const,
      presetVersion: 6,
      role: ROLE as const,
      widgets: [],
    };
    setDashboardLayoutStateV2(USER, ROLE, state);
    resetDashboardWidgetLayoutState(USER, ROLE);
    expect(getDashboardLayoutStateV2(USER, ROLE)).toBeNull();
  });

  it('dispatches event on set', () => {
    const spy = vi.fn();
    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
    setDashboardLayoutStateV2(USER, ROLE, {
      version: 2,
      presetVersion: 6,
      role: ROLE,
      widgets: [],
    });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
  });
});

// ── Legacy Key Cleanup ───────────────────────────────────────────
describe('legacy key cleanup', () => {
  it('resetDashboardEnabledWidgetIds removes the key', () => {
    window.localStorage.setItem(`hrms.ui.dashboard.widgets.${USER}.${ROLE}`, '["w1"]');
    resetDashboardEnabledWidgetIds(USER, ROLE);
    expect(window.localStorage.getItem(`hrms.ui.dashboard.widgets.${USER}.${ROLE}`)).toBeNull();
  });

  it('resetDashboardWidgetSpanMap removes the key', () => {
    window.localStorage.setItem(`hrms.ui.dashboard.widgetSpans.${USER}.${ROLE}`, '{"w1":2}');
    resetDashboardWidgetSpanMap(USER, ROLE);
    expect(window.localStorage.getItem(`hrms.ui.dashboard.widgetSpans.${USER}.${ROLE}`)).toBeNull();
  });
});

// ── Admin Stats Card IDs ─────────────────────────────────────────
describe('getAdminStatsEnabledCardIds', () => {
  const allowed = ['c1', 'c2', 'c3'];
  const defaults = ['c1'];

  it('returns defaults when nothing stored', () => {
    expect(getAdminStatsEnabledCardIds(USER, ROLE, allowed, defaults)).toEqual(defaults);
  });

  it('returns stored card IDs when valid', () => {
    setAdminStatsEnabledCardIds(USER, ROLE, ['c2', 'c3']);
    expect(getAdminStatsEnabledCardIds(USER, ROLE, allowed, defaults)).toEqual(['c2', 'c3']);
  });

  it('filters out unknown card IDs', () => {
    setAdminStatsEnabledCardIds(USER, ROLE, ['c1', 'xxx']);
    expect(getAdminStatsEnabledCardIds(USER, ROLE, allowed, defaults)).toEqual(['c1']);
  });

  it('returns defaults when all stored IDs are unknown', () => {
    setAdminStatsEnabledCardIds(USER, ROLE, ['xxx', 'yyy']);
    expect(getAdminStatsEnabledCardIds(USER, ROLE, allowed, defaults)).toEqual(defaults);
  });

  it('returns defaults for corrupted JSON', () => {
    window.localStorage.setItem(
      `hrms.ui.admin.stats.cards.${USER}.${ROLE}`,
      'nope',
    );
    expect(getAdminStatsEnabledCardIds(USER, ROLE, allowed, defaults)).toEqual(defaults);
  });
});

describe('resetAdminStatsEnabledCardIds', () => {
  it('removes stored card IDs', () => {
    setAdminStatsEnabledCardIds(USER, ROLE, ['c2']);
    resetAdminStatsEnabledCardIds(USER, ROLE);
    expect(getAdminStatsEnabledCardIds(USER, ROLE, ['c1', 'c2'], ['c1'])).toEqual(['c1']);
  });
});

// ── Admin Stats Layout State ─────────────────────────────────────
describe('admin stats layout state', () => {
  it('returns null when nothing stored', () => {
    expect(getAdminStatsLayoutState(USER, ROLE)).toBeNull();
  });

  it('round-trips layout state via set/get', () => {
    const layout = {
      version: 1,
      items: [{ id: 'stat1', x: 0, y: 0, w: 2, h: 1 }],
    };
    setAdminStatsLayoutState(USER, ROLE, layout);
    const result = getAdminStatsLayoutState(USER, ROLE);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].id).toBe('stat1');
    expect(result!.items[0].w).toBe(2);
  });

  it('returns null for corrupt JSON', () => {
    window.localStorage.setItem(
      `hrms.ui.admin.stats.layout.${USER}.${ROLE}`,
      'bad-json',
    );
    expect(getAdminStatsLayoutState(USER, ROLE)).toBeNull();
  });

  it('returns null for JSON without items array', () => {
    window.localStorage.setItem(
      `hrms.ui.admin.stats.layout.${USER}.${ROLE}`,
      '{"version": 1}',
    );
    expect(getAdminStatsLayoutState(USER, ROLE)).toBeNull();
  });

  it('resets layout state', () => {
    const layout = { version: 1, items: [{ id: 't', x: 0, y: 0, w: 1, h: 1 }] };
    setAdminStatsLayoutState(USER, ROLE, layout);
    resetAdminStatsLayoutState(USER, ROLE);
    expect(getAdminStatsLayoutState(USER, ROLE)).toBeNull();
  });
});

// ── Leave Display Preferences ────────────────────────────────────
describe('getLeaveDisplayPrefs', () => {
  const allIds = ['lt1', 'lt2', 'lt3'];

  it('returns all IDs as visible when nothing stored', () => {
    const prefs = getLeaveDisplayPrefs(USER, ROLE, allIds);
    expect(prefs.visibleIds).toEqual(allIds);
  });

  it('returns stored visible IDs', () => {
    setLeaveDisplayPrefs(USER, ROLE, { visibleIds: ['lt2'] });
    const prefs = getLeaveDisplayPrefs(USER, ROLE, allIds);
    expect(prefs.visibleIds).toEqual(['lt2']);
  });

  it('filters out unknown leave type IDs', () => {
    setLeaveDisplayPrefs(USER, ROLE, { visibleIds: ['lt1', 'unknown'] });
    const prefs = getLeaveDisplayPrefs(USER, ROLE, allIds);
    expect(prefs.visibleIds).toEqual(['lt1']);
  });

  it('returns all IDs for corrupted JSON', () => {
    window.localStorage.setItem(
      `hrms.ui.leave.displayPrefs.${USER}.${ROLE}`,
      'corrupt',
    );
    expect(getLeaveDisplayPrefs(USER, ROLE, allIds).visibleIds).toEqual(allIds);
  });

  it('returns all IDs for JSON without visibleIds array', () => {
    window.localStorage.setItem(
      `hrms.ui.leave.displayPrefs.${USER}.${ROLE}`,
      '{"visibleIds": "not-array"}',
    );
    expect(getLeaveDisplayPrefs(USER, ROLE, allIds).visibleIds).toEqual(allIds);
  });

  it('handles set/reset round-trip', () => {
    setLeaveDisplayPrefs(USER, ROLE, { visibleIds: ['lt3'] });
    expect(getLeaveDisplayPrefs(USER, ROLE, allIds).visibleIds).toEqual(['lt3']);

    resetLeaveDisplayPrefs(USER, ROLE);
    expect(getLeaveDisplayPrefs(USER, ROLE, allIds).visibleIds).toEqual(allIds);
  });
});

describe('setLeaveDisplayPrefs', () => {
  it('dispatches event on set', () => {
    const spy = vi.fn();
    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
    setLeaveDisplayPrefs(USER, ROLE, { visibleIds: ['lt1'] });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
  });
});

describe('resetLeaveDisplayPrefs', () => {
  it('dispatches event on reset', () => {
    const spy = vi.fn();
    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
    resetLeaveDisplayPrefs(USER, ROLE);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
  });
});
