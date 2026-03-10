/**
 * Widget dispatcher — maps widgetId → concrete component, wrapped in error boundary.
 */
import type { AppRole } from '@/types/hrms';
import type { DashboardWidgetId } from '@/lib/dashboard-layout';
import { WIDGET_META } from '../dashboard-config';

import {
  AttendanceTodayWidget,
  LeaveBalanceWidget,
  AnnouncementsWidget,
  TrainingSummaryWidget,
  PerformanceSummaryWidget,
} from './EmployeeWidgets';
import { TeamSnapshotWidget, OnLeaveTodayWidget } from './ManagerWidgets';
import { ExecutiveMetricsWidget, CriticalInsightsWidget } from './ExecutiveWidgets';
import { ChartsWidget } from './ChartsWidget';
import { CalendarPreviewWidget } from './CalendarPreviewWidget';
import { RecentActivityWidget } from './RecentActivityWidget';
import { PendingActionsWidget } from './PendingActionsWidget';
import { DashboardWidgetErrorBoundary } from './shared';

interface DashboardWidgetRendererProps {
  widgetId: DashboardWidgetId;
  role: AppRole;
}

function WidgetSwitch({ widgetId, role }: { widgetId: DashboardWidgetId; role: AppRole }) {
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
    case 'charts':
      return <ChartsWidget />;
    case 'calendarPreview':
      return <CalendarPreviewWidget />;
    case 'recentActivity':
      return <RecentActivityWidget />;
    case 'pendingActions':
      return <PendingActionsWidget role={role} />;
    default:
      return null;
  }
}

export function DashboardWidgetRenderer({ widgetId, role }: DashboardWidgetRendererProps) {
  const meta = WIDGET_META[widgetId];
  return (
    <DashboardWidgetErrorBoundary widgetLabel={meta?.label ?? widgetId}>
      <WidgetSwitch widgetId={widgetId} role={role} />
    </DashboardWidgetErrorBoundary>
  );
}
