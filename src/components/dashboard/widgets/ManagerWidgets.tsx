/**
 * Manager/team-scope dashboard widgets:
 * TeamSnapshotWidget, OnLeaveTodayWidget
 */
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarDays, Users } from 'lucide-react';

import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import type { AppRole } from '@/types/hrms';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/system';

import { DashboardWidgetCard, MetricChip, useDashboardOnLeaveTodayRoster } from './shared';
import { clampPercent, formatStatusLabel, getScopeLabel } from '../dashboard-config';

// ── Team Snapshot ────────────────────────────────────────────────

export function TeamSnapshotWidget({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useExecutiveStats();
  const scopeLabel = getScopeLabel(role, stats ?? null);
  const title = role === 'manager' ? 'Dept Snapshot' : role === 'admin' ? 'Live Attendance Status' : 'Operational Snapshot';
  const description = role === 'admin'
    ? 'Real-time tracking for today.'
    : `Attendance and staffing visibility for ${scopeLabel}.`;

  if (isLoading) {
    return (
      <DashboardWidgetCard title={title} description={description} icon={Users}>
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </DashboardWidgetCard>
    );
  }

  if (!stats) return null;

  const totalScopeEmployees = role === 'manager' ? (stats.departmentEmployeeCount ?? stats.activeEmployees) : stats.activeEmployees;

  return (
    <DashboardWidgetCard
      title={title}
      description={role === 'admin' ? 'Real-time tracking for Today' : `Total staffing and daily attendance for ${scopeLabel}.`}
      icon={Users}
      action={
        role === 'admin' ? (
          <StatusBadge status="success" labelOverride="Active Shift" size="md" />
        ) : (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/attendance')}>
            Attendance
          </Button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricChip label={role === 'manager' ? 'Dept. Employees' : 'Active Staff'} value={totalScopeEmployees} tone="info" />
        <MetricChip label="Present" value={stats.presentToday} tone="success" />
        <MetricChip label="Absent" value={stats.absentToday} tone={stats.absentToday > 0 ? 'warning' : 'default'} />
        <MetricChip label="On Leave" value={stats.onLeaveToday} tone="info" />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Attendance Rate Today</p>
            <p className="text-xs text-muted-foreground">Monthly average: {stats.avgAttendanceThisMonth}%</p>
          </div>
          <StatusBadge
            status={
              stats.attendanceRate >= 85
                ? 'success'
                : stats.attendanceRate >= 70
                  ? 'warning'
                  : 'error'
            }
            labelOverride={`${stats.attendanceRate}%`}
            size="md"
          />
        </div>
        <Progress value={clampPercent(stats.attendanceRate)} className="mt-3 h-2.5" />
      </div>
    </DashboardWidgetCard>
  );
}

// ── On Leave Today ───────────────────────────────────────────────

export function OnLeaveTodayWidget({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { data: roster, isLoading } = useDashboardOnLeaveTodayRoster();
  const { data: stats } = useExecutiveStats();
  const scopeLabel = getScopeLabel(role, stats ?? null);
  const isAdminViewer = role === 'admin';

  return (
    <DashboardWidgetCard
      title={isAdminViewer ? 'Team Calendar' : 'Who Is On Leave Today'}
      description={isAdminViewer ? 'Today leave schedule overview.' : `Live leave roster for ${scopeLabel}.`}
      icon={CalendarDays}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/calendar')}>
          {isAdminViewer ? 'Full Calendar View' : 'Team Calendar'}
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (roster?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          No one is on leave today in your current scope.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {isAdminViewer ? (
              <>
                <span className="font-medium uppercase tracking-wide">Today</span>
                <span>{format(new Date(), 'MMM d')}</span>
              </>
            ) : (
              <>
                <span>Showing up to 12 records</span>
                <span>{stats?.onLeaveToday ?? roster?.length ?? 0} total on leave today</span>
              </>
            )}
          </div>
          {(roster ?? []).map((person) => (
            <div key={person.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{person.employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  {person.leaveTypeName} • {format(new Date(person.startDate), 'MMM d')} – {format(new Date(person.endDate), 'MMM d')}
                </p>
              </div>
              <StatusBadge status={person.status} labelOverride={formatStatusLabel(person.status)} />
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
