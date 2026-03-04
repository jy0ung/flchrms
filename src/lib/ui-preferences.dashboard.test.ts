import { describe, expect, it } from 'vitest';

import {
  getDashboardLayoutStateV2,
  setDashboardLayoutStateV2,
  resetDashboardWidgetLayoutState,
} from '@/lib/ui-preferences';

const USER_ID = 'test-user';
const ROLE = 'employee';
const DASHBOARD_LAYOUT_KEY = `hrms.ui.dashboard.layout.${USER_ID}.${ROLE}`;

describe('ui-preferences dashboard layout parsing', () => {
  it('parses dashboard v2 layout state', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_KEY,
      JSON.stringify({
        version: 2,
        presetVersion: 4,
        role: ROLE,
        widgets: [
          {
            id: 'attendanceToday',
            x: 0,
            y: 0,
            w: 8,
            h: 4,
            visible: true,
          },
        ],
      }),
    );

    const parsed = getDashboardLayoutStateV2(USER_ID, ROLE);
    expect(parsed?.version).toBe(2);
    expect(parsed?.widgets).toHaveLength(1);
  });

  it('returns null for non-V2 layout state', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_KEY,
      JSON.stringify({
        version: 1,
        items: [{ id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4 }],
      }),
    );

    expect(getDashboardLayoutStateV2(USER_ID, ROLE)).toBeNull();
  });

  it('returns null for future version layout state', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_KEY,
      JSON.stringify({
        version: 99,
        presetVersion: 4,
        role: ROLE,
        widgets: [],
      }),
    );

    expect(getDashboardLayoutStateV2(USER_ID, ROLE)).toBeNull();
  });

  it('round-trips via set/get', () => {
    window.localStorage.clear();
    const state = {
      version: 2 as const,
      presetVersion: 6,
      role: ROLE as const,
      widgets: [
        { id: 'attendanceToday' as const, x: 0, y: 0, w: 8, h: 4, visible: true },
      ],
    };
    setDashboardLayoutStateV2(USER_ID, ROLE, state);
    const parsed = getDashboardLayoutStateV2(USER_ID, ROLE);
    expect(parsed).toEqual(state);
  });

  it('resets layout state', () => {
    window.localStorage.clear();
    const state = {
      version: 2 as const,
      presetVersion: 6,
      role: ROLE as const,
      widgets: [],
    };
    setDashboardLayoutStateV2(USER_ID, ROLE, state);
    resetDashboardWidgetLayoutState(USER_ID, ROLE);
    expect(getDashboardLayoutStateV2(USER_ID, ROLE)).toBeNull();
  });

  it('rejects state with mismatched role', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_KEY,
      JSON.stringify({
        version: 2,
        presetVersion: 4,
        role: 'admin',
        widgets: [],
      }),
    );

    // Requesting for 'employee' but stored role is 'admin'
    expect(getDashboardLayoutStateV2(USER_ID, ROLE)).toBeNull();
  });
});
