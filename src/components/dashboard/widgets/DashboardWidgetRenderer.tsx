/**
 * Widget dispatcher — maps widgetId → concrete component.
 */
import type { AppRole } from '@/types/hrms';
import type { DashboardWidgetId } from '@/lib/dashboard-layout';

import {
  AttendanceTodayWidget,
  LeaveBalanceWidget,
  AnnouncementsWidget,
  TrainingSummaryWidget,
  PerformanceSummaryWidget,
} from './EmployeeWidgets';
import { TeamSnapshotWidget, OnLeaveTodayWidget } from './ManagerWidgets';
import { ExecutiveMetricsWidget, CriticalInsightsWidget } from './ExecutiveWidgets';

export function DashboardWidgetRenderer({ widgetId, role }: { widgetId: DashboardWidgetId; role: AppRole }) {
  switch (widgetId) {
    case 'attendanceToday':
      return <AttendanceTodayWidget />;
    case 'leaveBalance':
      return <LeaveBalanceWidget />;
    case 'announcements':
      return <AnnouncementsWidget />;
    case 'trainingSummary':
      return <TrainingSummaryWidget />;
    case 'performanceSummary':
      return <PerformanceSummaryWidget />;
    case 'teamSnapshot':
      return <TeamSnapshotWidget role={role} />;
    case 'onLeaveToday':
      return <OnLeaveTodayWidget role={role} />;
    case 'criticalInsights':
      return <CriticalInsightsWidget role={role} />;
    case 'executiveMetrics':
      return <ExecutiveMetricsWidget role={role} />;
    default:
      return null;
  }
}
