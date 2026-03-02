import { describe, expect, it } from 'vitest';

import {
  TIER_WIDTH_RULES,
  assertDashboardLayoutInvariants,
  compactLaneWidgets,
  migrateLegacyDashboardLayoutToV2,
  normalizeDashboardLayoutStateV2,
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

describe('dashboard-layout', () => {
  it('migrates legacy layout to v2 while preserving visibility and width intent', () => {
    const role: AppRole = 'employee';
    const migrated = migrateLegacyDashboardLayoutToV2({
      role,
      presetVersion: 4,
      definitions,
      legacyLayoutItems: [
        { id: 'attendanceToday', x: 4, y: 0, w: 7, h: 4 },
        { id: 'leaveBalance', x: 0, y: 3, w: 9, h: 4 },
      ],
      legacyEnabledWidgetIds: ['attendanceToday'],
      legacyWidthById: { leaveBalance: 10 },
      defaultOrderedWidgetIds: ['attendanceToday', 'leaveBalance', 'announcements', 'trainingSummary', 'performanceSummary'],
    });

    const attendance = migrated.widgets.find((widget) => widget.id === 'attendanceToday');
    const leaveBalance = migrated.widgets.find((widget) => widget.id === 'leaveBalance');
    expect(attendance?.visible).toBe(true);
    expect(attendance?.w).toBe(7);
    expect(leaveBalance?.visible).toBe(false);
    expect(leaveBalance?.w).toBe(10);
    expect(migrated.version).toBe(2);
    expect(migrated.presetVersion).toBe(4);
  });

  it('compacts lane widgets deterministically without holes', () => {
    const compacted = compactLaneWidgets(
      [
        { id: 'criticalInsights', x: 0, y: 0, w: 8, h: 4, visible: true },
        { id: 'executiveMetrics', x: 0, y: 3, w: 4, h: 4, visible: true },
      ],
      'primary',
    );
    expect(compacted.map((widget) => widget.id)).toEqual(['criticalInsights', 'executiveMetrics']);
    expect(compacted[0]).toMatchObject({ x: 0, y: 0, w: 8 });
    expect(compacted[1]).toMatchObject({ x: 8, y: 0, w: 4 });
  });

  it('normalizes widths by tier rules and validates invariants', () => {
    const state: DashboardLayoutStateV2 = {
      version: 2,
      presetVersion: 4,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 2, h: 4, visible: true },
        { id: 'leaveBalance', x: 10, y: 0, w: 12, h: 4, visible: true },
        { id: 'announcements', x: 0, y: 0, w: 30, h: 4, visible: false },
      ],
    };

    const normalized = normalizeDashboardLayoutStateV2({
      state,
      definitions,
      role: 'employee',
      presetVersion: 4,
      rulesByTier: TIER_WIDTH_RULES,
    });

    expect(normalized.widgets.find((widget) => widget.id === 'attendanceToday')?.w).toBeGreaterThanOrEqual(4);
    expect(normalized.widgets.find((widget) => widget.id === 'leaveBalance')?.x ?? 0).toBeLessThanOrEqual(8);
    expect(() =>
      assertDashboardLayoutInvariants(normalized, definitions, TIER_WIDTH_RULES),
    ).not.toThrow();
  });

  it('throws for duplicate ids in invariant validation', () => {
    const invalid: DashboardLayoutStateV2 = {
      version: 2,
      presetVersion: 4,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
        { id: 'attendanceToday', x: 0, y: 1, w: 8, h: 4, visible: false },
      ],
    };

    expect(() => assertDashboardLayoutInvariants(invalid, definitions)).toThrow(/Duplicate dashboard widget id/i);
  });
});
