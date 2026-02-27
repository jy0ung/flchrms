import { describe, expect, it } from 'vitest';

import {
  getDashboardLayoutStateV2,
  getDashboardStoredLayoutVersion,
  getDashboardWidgetLayoutState,
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
    expect(getDashboardWidgetLayoutState(USER_ID, ROLE)).toBeNull();
  });

  it('falls back to legacy layout object parser', () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      DASHBOARD_LAYOUT_KEY,
      JSON.stringify({
        version: 1,
        items: [{ id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4 }],
      }),
    );

    const legacy = getDashboardWidgetLayoutState(USER_ID, ROLE);
    expect(legacy?.items).toHaveLength(1);
    expect(getDashboardLayoutStateV2(USER_ID, ROLE)).toBeNull();
  });

  it('reads stored layout version for forward-version guards', () => {
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

    expect(getDashboardStoredLayoutVersion(USER_ID, ROLE)).toBe(99);
  });
});
