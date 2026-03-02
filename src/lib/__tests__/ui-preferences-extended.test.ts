import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getFloatingNotificationsVisible,
  setFloatingNotificationsVisible,
  getDashboardEnabledWidgetIds,
  setDashboardEnabledWidgetIds,
  resetDashboardEnabledWidgetIds,
  getDashboardWidgetSpanMap,
  setDashboardWidgetSpanMap,
  resetDashboardWidgetSpanMap,
  setDashboardWidgetLayoutState,
  resetDashboardWidgetLayoutState,
  getDashboardLayoutPresetVersion,
  setDashboardLayoutPresetVersion,
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

// ── Dashboard Widget IDs ─────────────────────────────────────────
describe('getDashboardEnabledWidgetIds', () => {
  const allowed = ['w1', 'w2', 'w3', 'w4'];
  const defaults = ['w1', 'w2'];

  it('returns defaults when nothing stored', () => {
    expect(getDashboardEnabledWidgetIds(USER, ROLE, allowed, defaults)).toEqual(defaults);
  });

  it('returns stored selection when valid', () => {
    setDashboardEnabledWidgetIds(USER, ROLE, ['w3', 'w4']);
    expect(getDashboardEnabledWidgetIds(USER, ROLE, allowed, defaults)).toEqual(['w3', 'w4']);
  });

  it('filters out widget IDs not in allowedWidgetIds', () => {
    setDashboardEnabledWidgetIds(USER, ROLE, ['w1', 'unknown', 'w3']);
    expect(getDashboardEnabledWidgetIds(USER, ROLE, allowed, defaults)).toEqual(['w1', 'w3']);
  });

  it('returns defaults if stored contains only unknown IDs', () => {
    setDashboardEnabledWidgetIds(USER, ROLE, ['alien1', 'alien2']);
    expect(getDashboardEnabledWidgetIds(USER, ROLE, allowed, defaults)).toEqual(defaults);
  });

  it('returns defaults for corrupted JSON', () => {
    window.localStorage.setItem(
      `hrms.ui.dashboard.widgets.${USER}.${ROLE}`,
      'not-json',
    );
    expect(getDashboardEnabledWidgetIds(USER, ROLE, allowed, defaults)).toEqual(defaults);
  });

  it('returns defaults for non-array JSON', () => {
    window.localStorage.setItem(
      `hrms.ui.dashboard.widgets.${USER}.${ROLE}`,
      '{"obj": true}',
    );
    expect(getDashboardEnabledWidgetIds(USER, ROLE, allowed, defaults)).toEqual(defaults);
  });

  it('deduplicates stored IDs', () => {
    setDashboardEnabledWidgetIds(USER, ROLE, ['w1', 'w1', 'w2', 'w2']);
    const result = getDashboardEnabledWidgetIds(USER, ROLE, allowed, defaults);
    expect(result).toEqual(['w1', 'w2']);
  });
});

describe('resetDashboardEnabledWidgetIds', () => {
  it('removes stored widget IDs', () => {
    setDashboardEnabledWidgetIds(USER, ROLE, ['w3']);
    resetDashboardEnabledWidgetIds(USER, ROLE);
    expect(getDashboardEnabledWidgetIds(USER, ROLE, ['w1', 'w2', 'w3'], ['w1'])).toEqual(['w1']);
  });

  it('dispatches custom event', () => {
    const spy = vi.fn();
    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
    resetDashboardEnabledWidgetIds(USER, ROLE);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
  });
});

// ── Dashboard Widget Span Map ────────────────────────────────────
describe('getDashboardWidgetSpanMap', () => {
  const allowed = ['w1', 'w2', 'w3'];
  const defaultSpans: Record<string, number> = { w1: 1, w2: 2, w3: 1 };

  it('returns defaults when nothing stored', () => {
    expect(getDashboardWidgetSpanMap(USER, ROLE, allowed, defaultSpans)).toEqual(defaultSpans);
  });

  it('uses stored span values', () => {
    setDashboardWidgetSpanMap(USER, ROLE, { w1: 3, w2: 1, w3: 2 });
    const result = getDashboardWidgetSpanMap(USER, ROLE, allowed, defaultSpans);
    expect(result.w1).toBe(3);
    expect(result.w2).toBe(1);
    expect(result.w3).toBe(2);
  });

  it('clamps span to valid range 1-3', () => {
    setDashboardWidgetSpanMap(USER, ROLE, { w1: 0, w2: 5, w3: 2 });
    const result = getDashboardWidgetSpanMap(USER, ROLE, allowed, defaultSpans);
    expect(result.w1).toBe(1);  // 0 < 1, uses default
    expect(result.w2).toBe(2);  // 5 > 3, uses default
    expect(result.w3).toBe(2);  // valid
  });

  it('returns defaults for corrupt JSON', () => {
    window.localStorage.setItem(
      `hrms.ui.dashboard.widgetSpans.${USER}.${ROLE}`,
      'bad',
    );
    expect(getDashboardWidgetSpanMap(USER, ROLE, allowed, defaultSpans)).toEqual(defaultSpans);
  });

  it('returns defaults for array JSON', () => {
    window.localStorage.setItem(
      `hrms.ui.dashboard.widgetSpans.${USER}.${ROLE}`,
      '[1,2]',
    );
    expect(getDashboardWidgetSpanMap(USER, ROLE, allowed, defaultSpans)).toEqual(defaultSpans);
  });
});

describe('resetDashboardWidgetSpanMap', () => {
  it('removes stored span map', () => {
    setDashboardWidgetSpanMap(USER, ROLE, { w1: 3 });
    resetDashboardWidgetSpanMap(USER, ROLE);
    const allowed = ['w1'];
    const defs = { w1: 1 };
    expect(getDashboardWidgetSpanMap(USER, ROLE, allowed, defs)).toEqual(defs);
  });
});

// ── Dashboard Widget Layout State ────────────────────────────────
describe('dashboard widget layout state', () => {
  it('set and reset layout state', () => {
    const layout = {
      version: 1,
      items: [{ id: 'tile1', x: 0, y: 0, w: 1, h: 1 }],
    };
    setDashboardWidgetLayoutState(USER, ROLE, layout);

    // Reset clears it
    resetDashboardWidgetLayoutState(USER, ROLE);
    const key = `hrms.ui.dashboard.layout.${USER}.${ROLE}`;
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('dispatches event on set', () => {
    const spy = vi.fn();
    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
    setDashboardWidgetLayoutState(USER, ROLE, {
      version: 1,
      items: [],
    });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, spy);
  });
});

// ── Dashboard Layout Preset Version ──────────────────────────────
describe('dashboardLayoutPresetVersion', () => {
  it('returns null when nothing stored', () => {
    expect(getDashboardLayoutPresetVersion(USER, ROLE)).toBeNull();
  });

  it('returns stored version number', () => {
    setDashboardLayoutPresetVersion(USER, ROLE, 5);
    expect(getDashboardLayoutPresetVersion(USER, ROLE)).toBe(5);
  });

  it('returns null for non-numeric stored value', () => {
    const key = `hrms.ui.dashboard.layoutPresetVersion.${USER}.${ROLE}`;
    window.localStorage.setItem(key, 'abc');
    expect(getDashboardLayoutPresetVersion(USER, ROLE)).toBeNull();
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

  it('filters out invalid items', () => {
    window.localStorage.setItem(
      `hrms.ui.admin.stats.layout.${USER}.${ROLE}`,
      JSON.stringify({
        version: 1,
        items: [
          { id: 'valid', x: 1, y: 2, w: 1, h: 1 },
          { id: '', x: 0, y: 0, w: 1, h: 1 }, // empty id → filtered
          null, // null → filtered
        ],
      }),
    );
    const result = getAdminStatsLayoutState(USER, ROLE);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].id).toBe('valid');
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
