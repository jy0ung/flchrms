/**
 * Executive/critical dashboard widgets:
 * ExecutiveMetricsWidget, CriticalInsightsWidget
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Target } from 'lucide-react';

import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import type { AppRole } from '@/types/hrms';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/system';

import { DashboardWidgetCard, MetricChip } from './shared';
import { getCriticalWidgetTitle, getScopeLabel } from '../dashboard-config';

// ── Executive Metrics ────────────────────────────────────────────

export function ExecutiveMetricsWidget({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { data: stats, isLoading, isError, refetch } = useExecutiveStats();
  const scopeLabel = getScopeLabel(role, stats ?? null);

  if (isLoading) {
    return (
      <DashboardWidgetCard title="Executive Metrics" description={`High-signal KPIs for ${scopeLabel}.`} icon={Target}>
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </DashboardWidgetCard>
    );
  }

  if (isError) {
    return (
      <DashboardWidgetCard title="Executive Metrics" description={`High-signal KPIs for ${scopeLabel}.`} icon={Target}>
        <QueryErrorState label="executive metrics" onRetry={() => void refetch()} />
      </DashboardWidgetCard>
    );
  }

  if (!stats) {
    return (
      <DashboardWidgetCard title="Executive Metrics" description={`High-signal KPIs for ${scopeLabel}.`} icon={Target}>
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          Executive metrics are temporarily unavailable.
        </div>
      </DashboardWidgetCard>
    );
  }

  return (
    <DashboardWidgetCard
      title="Executive Metrics"
      description={`High-signal workforce and operations KPIs for ${scopeLabel}.`}
      icon={Target}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/employees')}>
          Workforce
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <MetricChip label="Training Completion" value={`${stats.trainingCompletionRate}%`} tone={stats.trainingCompletionRate >= 70 ? 'success' : 'warning'} />
        <MetricChip label="New Hires" value={stats.newHiresThisMonth} tone={stats.newHiresThisMonth > 0 ? 'info' : 'default'} />
        <MetricChip label="Approved Leaves" value={stats.approvedLeavesThisMonth} tone={stats.approvedLeavesThisMonth > 0 ? 'info' : 'default'} />
        <MetricChip label="Completed Reviews" value={stats.completedReviewsThisMonth} tone={stats.completedReviewsThisMonth > 0 ? 'success' : 'default'} />
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Attendance rate today</span>
          <span className="font-medium">{stats.attendanceRate}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Monthly attendance average</span>
          <span className="font-medium">{stats.avgAttendanceThisMonth}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Active trainings</span>
          <span className="font-medium">{stats.activeTrainings}</span>
        </div>
      </div>
    </DashboardWidgetCard>
  );
}

// ── Critical Insights ────────────────────────────────────────────

export function CriticalInsightsWidget({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { data: stats, isLoading, isError, refetch } = useExecutiveStats();
  const scopeLabel = getScopeLabel(role, stats ?? null);

  const alerts = useMemo(() => {
    if (!stats) return [] as Array<{ tone: 'danger' | 'warning' | 'info'; title: string; detail: string; route?: string }>;

    const nextAlerts: Array<{ tone: 'danger' | 'warning' | 'info'; title: string; detail: string; route?: string }> = [];

    if (stats.attendanceRate < 70) {
      nextAlerts.push({
        tone: 'danger',
        title: 'Attendance rate below threshold',
        detail: `${stats.attendanceRate}% attendance today in ${scopeLabel}. Review absences and late arrivals.`,
        route: '/attendance',
      });
    } else if (stats.attendanceRate < 85) {
      nextAlerts.push({
        tone: 'warning',
        title: 'Attendance trending lower than target',
        detail: `${stats.attendanceRate}% today vs ${stats.avgAttendanceThisMonth}% monthly average.`,
        route: '/attendance',
      });
    }

    if (stats.pendingLeaveRequests > 5) {
      nextAlerts.push({
        tone: stats.pendingLeaveRequests > 10 ? 'warning' : 'info',
        title: 'Leave approvals pending',
        detail: `${stats.pendingLeaveRequests} leave request(s) are waiting for approval action.`,
        route: '/leave',
      });
    }

    if (stats.pendingReviews > 3) {
      nextAlerts.push({
        tone: stats.pendingReviews > 8 ? 'warning' : 'info',
        title: 'Performance reviews pending',
        detail: `${stats.pendingReviews} review(s) remain in draft or incomplete state.`,
        route: '/performance',
      });
    }

    if (stats.trainingCompletionRate < 60) {
      nextAlerts.push({
        tone: 'warning',
        title: 'Training completion rate is low',
        detail: `Completion rate is ${stats.trainingCompletionRate}% — track critical programs and overdue enrollments.`,
        route: '/training',
      });
    }

    if (nextAlerts.length === 0) {
      nextAlerts.push({
        tone: 'info',
        title: 'No critical exceptions detected',
        detail: `Operational KPIs in ${scopeLabel} are within the current dashboard thresholds.`,
      });
    }

    return nextAlerts.slice(0, 4);
  }, [scopeLabel, stats]);

  const toneClasses: Record<'danger' | 'warning' | 'info', string> = {
    danger: 'border-destructive/20 bg-destructive/5',
    warning: 'border-warning/20 bg-warning/5',
    info: 'border-info/20 bg-info/5',
  };

  if (isLoading) {
    return (
      <DashboardWidgetCard title={getCriticalWidgetTitle(role)} description={`Operational risk signals for ${scopeLabel}.`} icon={ShieldAlert}>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </DashboardWidgetCard>
    );
  }

  if (isError) {
    return (
      <DashboardWidgetCard title={getCriticalWidgetTitle(role)} description={`Operational risk signals for ${scopeLabel}.`} icon={ShieldAlert}>
        <QueryErrorState label="critical insights" onRetry={() => void refetch()} />
      </DashboardWidgetCard>
    );
  }

  if (!stats) {
    return (
      <DashboardWidgetCard title={getCriticalWidgetTitle(role)} description={`Operational risk signals for ${scopeLabel}.`} icon={ShieldAlert}>
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          Critical insight data is temporarily unavailable.
        </div>
      </DashboardWidgetCard>
    );
  }

  return (
    <DashboardWidgetCard
      title={getCriticalWidgetTitle(role)}
      description={`Prioritized operational signals and next actions for ${scopeLabel}.`}
      icon={ShieldAlert}
    >
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div key={`${alert.title}-${index}`} className={cn('rounded-lg border p-3', toneClasses[alert.tone])}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
              </div>
              {alert.route ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full rounded-full sm:w-auto"
                  onClick={() => navigate(alert.route!)}
                  aria-label={`Open action for ${alert.title}`}
                >
                  Open
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
