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
import { StatusBadge } from '@/components/system';

import { DashboardWidgetCard, MetricChip } from './shared';
import { getCriticalWidgetTitle, getScopeLabel } from '../dashboard-config';

// ── Executive Metrics ────────────────────────────────────────────

export function ExecutiveMetricsWidget({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useExecutiveStats();
  const scopeLabel = getScopeLabel(role, stats ?? null);

  if (isLoading) {
    return (
      <DashboardWidgetCard title="Executive Metrics" description={`High-signal KPIs for ${scopeLabel}.`} icon={Target}>
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </DashboardWidgetCard>
    );
  }

  if (!stats) return null;

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
        <MetricChip label="Pending Leaves" value={stats.pendingLeaveRequests} tone={stats.pendingLeaveRequests > 5 ? 'warning' : 'default'} />
        <MetricChip label="Pending Reviews" value={stats.pendingReviews} tone={stats.pendingReviews > 0 ? 'warning' : 'default'} />
        <MetricChip label="Training Completion" value={`${stats.trainingCompletionRate}%`} tone={stats.trainingCompletionRate >= 70 ? 'success' : 'warning'} />
        <MetricChip label="New Hires (Month)" value={stats.newHiresThisMonth} tone="info" />
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Approved leaves this month</span>
          <span className="font-medium">{stats.approvedLeavesThisMonth}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Completed reviews this month</span>
          <span className="font-medium">{stats.completedReviewsThisMonth}</span>
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
  const { data: stats, isLoading } = useExecutiveStats();
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

    if (stats.pendingLeaveRequests > 0) {
      nextAlerts.push({
        tone: stats.pendingLeaveRequests > 5 ? 'warning' : 'info',
        title: 'Leave approvals pending',
        detail: `${stats.pendingLeaveRequests} leave request(s) are waiting for approval action.`,
        route: '/leave',
      });
    }

    if (stats.pendingReviews > 0) {
      nextAlerts.push({
        tone: stats.pendingReviews > 5 ? 'warning' : 'info',
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
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </DashboardWidgetCard>
    );
  }

  if (!stats) return null;

  if (role === 'admin') {
    return (
      <DashboardWidgetCard
        title="Executive Snapshot"
        description={`Operational dashboard for ${scopeLabel}.`}
        icon={ShieldAlert}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-warning/25 bg-warning/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pending Approvals</p>
            <p className="mt-2 text-3xl font-bold">{stats.pendingLeaveRequests}</p>
            <p className="mt-2 text-xs text-muted-foreground">Leave approvals awaiting action</p>
            <p className="mt-1 text-xs font-medium text-warning">
              {stats.pendingLeaveRequests > 0 ? `${stats.pendingLeaveRequests} in queue` : 'No pending approvals'}
            </p>
          </div>

          <div className="rounded-xl border border-info/25 bg-info/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Training Progress</p>
            <p className="mt-2 text-3xl font-bold">{stats.trainingCompletionRate}%</p>
            <p className="mt-2 text-xs text-muted-foreground">Compliance and program completion</p>
            <p className="mt-1 text-xs font-medium text-info">+{stats.completedTrainingsThisMonth} completed this month</p>
          </div>

          <div className="rounded-xl border border-success/25 bg-success/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Attendance Rate</p>
            <p className="mt-2 text-3xl font-bold">{stats.attendanceRate}%</p>
            <p className="mt-2 text-xs text-muted-foreground">Company average today</p>
            <p className="mt-1 text-xs font-medium text-success">Monthly avg {stats.avgAttendanceThisMonth}%</p>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary p-3 text-primary-foreground">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/80">Total Workforce</p>
            <p className="mt-2 text-3xl font-bold">{stats.totalEmployees.toLocaleString()}</p>
            <p className="mt-2 text-xs text-primary-foreground/80">Organization headcount</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-primary-foreground/10 px-2 py-1.5 text-center">
                <p className="text-[10px] uppercase tracking-wide text-primary-foreground/80">On Leave</p>
                <p className="text-sm font-semibold">{stats.onLeaveToday}</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/10 px-2 py-1.5 text-center">
                <p className="text-[10px] uppercase tracking-wide text-primary-foreground/80">Open Reviews</p>
                <p className="text-sm font-semibold">{stats.pendingReviews}</p>
              </div>
            </div>
          </div>
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
          <div key={`${alert.title}-${index}`} className={cn('rounded-xl border p-3', toneClasses[alert.tone])}>
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
