import { describe, expect, it } from 'vitest';

import {
  GRID_COLUMNS,
  TIER_WIDTH_RULES,
  clampWidgetWidthByTier,
  isDashboardLayoutStateV2,
  normalizeDashboardLayoutStateV2,
  buildDefaultDashboardLayoutV2,
  compactLayoutVertically,
  type DashboardLayoutStateV2,
  type DashboardWidgetDefinition,
  type DashboardWidgetId,
} from '@/lib/dashboard-layout';
import { type AppRole } from '@/types/hrms';

const definitions: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  attendanceToday: {
    id: 'attendanceToday',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: 8,
    defaultH: 4,
    minW: 4,
    maxW: 12,
  },
  leaveBalance: {
    id: 'leaveBalance',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director'],
    defaultW: 4,
    defaultH: 4,
    minW: 4,
    maxW: 12,
  },
  announcements: {
    id: 'announcements',
    defaultTier: 'secondary',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: 12,
    defaultH: 4,
    minW: 4,
    maxW: 12,
  },
  trainingSummary: {
    id: 'trainingSummary',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director'],
    defaultW: 8,
    defaultH: 4,
    minW: 4,
    maxW: 12,
  },
  performanceSummary: {
    id: 'performanceSummary',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director'],
    defaultW: 4,
    defaultH: 4,
    minW: 4,
    maxW: 12,
  },
  teamSnapshot: {
    id: 'teamSnapshot',
    defaultTier: 'secondary',
    allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: 8,
    defaultH: 4,
    minW: 4,
    maxW: 12,
  },
  onLeaveToday: {
    id: 'onLeaveToday',
    defaultTier: 'secondary',
    allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: 4,
    defaultH: 4,
    minW: 4,
    maxW: 12,
  },
  criticalInsights: {
    id: 'criticalInsights',
    defaultTier: 'primary',
    allowedRoles: ['general_manager', 'hr', 'director', 'admin'],
    defaultW: 8,
    defaultH: 4,
    minW: 3,
    maxW: 12,
  },
  executiveMetrics: {
    id: 'executiveMetrics',
    defaultTier: 'primary',
    allowedRoles: ['general_manager', 'hr', 'director', 'admin'],
    defaultW: 4,
    defaultH: 4,
    minW: 3,
    maxW: 12,
  },
};

// Subset of definitions used in most tests
const subsetDefs = {
  attendanceToday: definitions.attendanceToday,
  leaveBalance: definitions.leaveBalance,
  announcements: definitions.announcements,
  trainingSummary: definitions.trainingSummary,
  performanceSummary: definitions.performanceSummary,
} as Record<DashboardWidgetId, DashboardWidgetDefinition>;

describe('dashboard-layout', () => {
  it('isDashboardLayoutStateV2 validates correct structures', () => {
    const valid: DashboardLayoutStateV2 = {
      version: 2,
      presetVersion: 6,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
      ],
    };
    expect(isDashboardLayoutStateV2(valid)).toBe(true);
  });

  it('isDashboardLayoutStateV2 rejects v1 layouts', () => {
    expect(isDashboardLayoutStateV2({ version: 1, items: [] })).toBe(false);
  });

  it('isDashboardLayoutStateV2 rejects nulls/primitives', () => {
    expect(isDashboardLayoutStateV2(null)).toBe(false);
    expect(isDashboardLayoutStateV2(42)).toBe(false);
    expect(isDashboardLayoutStateV2('test')).toBe(false);
  });

  it('clampWidgetWidthByTier clamps to tier min/max', () => {
    // supporting: minW=4, maxW=12
    expect(clampWidgetWidthByTier(2, 'supporting')).toBe(4);
    expect(clampWidgetWidthByTier(15, 'supporting')).toBe(12);
    expect(clampWidgetWidthByTier(8, 'supporting')).toBe(8);

    // primary: minW=3, maxW=12
    expect(clampWidgetWidthByTier(1, 'primary')).toBe(3);
    expect(clampWidgetWidthByTier(6, 'primary')).toBe(6);
  });

  it('normalizeDashboardLayoutStateV2 clamps widths and deduplicates', () => {
    const state: DashboardLayoutStateV2 = {
      version: 2,
      presetVersion: 4,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 2, h: 4, visible: true },
        { id: 'attendanceToday', x: 0, y: 4, w: 8, h: 4, visible: true }, // duplicate
        { id: 'leaveBalance', x: 10, y: 0, w: 20, h: 4, visible: true },
      ],
    };

    const normalized = normalizeDashboardLayoutStateV2({
      state,
      definitions: subsetDefs,
      role: 'employee',
      presetVersion: 4,
    });

    // Width clamped for supporting tier: min 4
    const att = normalized.widgets.find((w) => w.id === 'attendanceToday');
    expect(att?.w).toBeGreaterThanOrEqual(4);

    // Width clamped to 12 max
    const lb = normalized.widgets.find((w) => w.id === 'leaveBalance');
    expect(lb?.w).toBeLessThanOrEqual(12);

    // Deduplicated — only one attendanceToday
    const attCount = normalized.widgets.filter((w) => w.id === 'attendanceToday').length;
    expect(attCount).toBe(1);
  });

  it('normalizeDashboardLayoutStateV2 seeds missing widgets as hidden', () => {
    const state: DashboardLayoutStateV2 = {
      version: 2,
      presetVersion: 4,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
      ],
    };

    const normalized = normalizeDashboardLayoutStateV2({
      state,
      definitions: subsetDefs,
      role: 'employee',
      presetVersion: 4,
    });

    // leaveBalance, announcements, trainingSummary, performanceSummary should be seeded
    expect(normalized.widgets.length).toBe(5);
    const lb = normalized.widgets.find((w) => w.id === 'leaveBalance');
    expect(lb?.visible).toBe(false);
  });

  it('normalizeDashboardLayoutStateV2 filters out widgets not allowed for role', () => {
    const state: DashboardLayoutStateV2 = {
      version: 2,
      presetVersion: 4,
      role: 'employee',
      widgets: [
        { id: 'criticalInsights', x: 0, y: 0, w: 8, h: 4, visible: true }, // not allowed for employee
        { id: 'attendanceToday', x: 0, y: 4, w: 8, h: 4, visible: true },
      ],
    };

    const normalized = normalizeDashboardLayoutStateV2({
      state,
      definitions,
      role: 'employee',
      presetVersion: 4,
    });

    const ci = normalized.widgets.find((w) => w.id === 'criticalInsights');
    expect(ci).toBeUndefined();
  });

  it('buildDefaultDashboardLayoutV2 creates correct layout', () => {
    const orderedIds: DashboardWidgetId[] = ['attendanceToday', 'leaveBalance', 'announcements'];
    const result = buildDefaultDashboardLayoutV2({
      definitions: subsetDefs,
      role: 'employee',
      presetVersion: 6,
      orderedWidgetIds: orderedIds,
    });

    expect(result.version).toBe(2);
    expect(result.presetVersion).toBe(6);
    expect(result.role).toBe('employee');

    // Visible widgets include the ordered ones
    const visible = result.widgets.filter((w) => w.visible);
    expect(visible.map((w) => w.id)).toEqual(orderedIds);

    // First two fit in one row: 8 + 4 = 12
    expect(visible[0]).toMatchObject({ id: 'attendanceToday', x: 0, y: 0, w: 8 });
    expect(visible[1]).toMatchObject({ id: 'leaveBalance', x: 8, y: 0, w: 4 });
    // announcements (w=12) wraps to next row
    expect(visible[2]).toMatchObject({ id: 'announcements', x: 0, w: 12 });
    expect(visible[2].y).toBeGreaterThan(0);

    // Hidden widgets (trainingSummary, performanceSummary) should be included
    const hidden = result.widgets.filter((w) => !w.visible);
    expect(hidden.length).toBe(2);
  });

  it('buildDefaultDashboardLayoutV2 respects role-allowed widgets only', () => {
    // admin cannot see leaveBalance or performanceSummary in our test defs
    const orderedIds: DashboardWidgetId[] = ['attendanceToday', 'leaveBalance', 'announcements'];
    const result = buildDefaultDashboardLayoutV2({
      definitions: subsetDefs,
      role: 'admin',
      presetVersion: 6,
      orderedWidgetIds: orderedIds,
    });

    const visibleIds = result.widgets.filter((w) => w.visible).map((w) => w.id);
    expect(visibleIds).not.toContain('leaveBalance');
    expect(visibleIds).toContain('attendanceToday');
    expect(visibleIds).toContain('announcements');
  });
});

describe('compactLayoutVertically', () => {
  it('leaves an already-compact layout unchanged', () => {
    const items = [
      { i: 'a', x: 0, y: 0, w: 8, h: 4 },
      { i: 'b', x: 8, y: 0, w: 4, h: 4 },
      { i: 'c', x: 0, y: 4, w: 12, h: 4 },
    ];
    const result = compactLayoutVertically(items);
    expect(result.map(({ i, y }) => ({ i, y }))).toEqual([
      { i: 'a', y: 0 },
      { i: 'b', y: 0 },
      { i: 'c', y: 4 },
    ]);
  });

  it('closes vertical gap left by a hidden widget', () => {
    // Simulates: row0 visible, row1 hidden (absent), row2 visible
    const items = [
      { i: 'a', x: 0, y: 0, w: 12, h: 4 },
      { i: 'c', x: 0, y: 8, w: 12, h: 4 }, // gap from y=4 to y=8
    ];
    const result = compactLayoutVertically(items);
    expect(result[0].y).toBe(0);
    expect(result[1].y).toBe(4); // compacted up
  });

  it('compacts items in different columns independently', () => {
    const items = [
      { i: 'a', x: 0, y: 0, w: 8, h: 4 },
      { i: 'b', x: 8, y: 0, w: 4, h: 2 },
      // Gap where hidden widgets were
      { i: 'c', x: 0, y: 8, w: 8, h: 4 },
      { i: 'd', x: 8, y: 8, w: 4, h: 4 },
    ];
    const result = compactLayoutVertically(items);
    // a (w=8): y=0, h=4 → cols 0-7 occupied to y=4
    // b (w=4): y=0, h=2 → cols 8-11 occupied to y=2
    // c (w=8): needs cols 0-7, earliest y=4
    // d (w=4): needs cols 8-11, earliest y=2
    expect(result.find((r) => r.i === 'c')?.y).toBe(4);
    expect(result.find((r) => r.i === 'd')?.y).toBe(2);
  });

  it('handles empty layout', () => {
    expect(compactLayoutVertically([])).toEqual([]);
  });

  it('preserves extra properties on items', () => {
    const items = [
      { i: 'a', x: 0, y: 5, w: 12, h: 4, minW: 3, maxW: 12 },
    ];
    const result = compactLayoutVertically(items);
    expect(result[0]).toMatchObject({ i: 'a', y: 0, minW: 3, maxW: 12 });
  });

  it('compacts realistic admin layout with hidden widget gap', () => {
    // Replicates the actual bug: hidden widget at y=4 leaves gap
    const items = [
      { i: 'attendanceToday', x: 0, y: 0, w: 8, h: 4 },
      { i: 'recentActivity', x: 8, y: 0, w: 4, h: 4 },
      // calendarPreview at y=4 was hidden — not in visible list
      { i: 'announcements', x: 0, y: 8, w: 12, h: 4 },
      { i: 'trainingSummary', x: 4, y: 12, w: 8, h: 4 },
    ];
    const result = compactLayoutVertically(items);
    expect(result.find((r) => r.i === 'announcements')?.y).toBe(4);
    expect(result.find((r) => r.i === 'trainingSummary')?.y).toBe(8);
  });
});
