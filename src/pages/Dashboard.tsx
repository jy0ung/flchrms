import { type DragEvent, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  GraduationCap,
  GripVertical,
  Loader2,
  Megaphone,
  Plus,
  Play,
  RefreshCcw,
  Settings2,
  ShieldAlert,
  Square,
  Target,
  TrendingUp,
  UserCheck,
  UserCircle,
  UserMinus,
  Users,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useMyEnrollments } from '@/hooks/useTraining';
import { useMyReviews } from '@/hooks/usePerformance';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { type ExecutiveStats } from '@/hooks/useExecutiveStats';
import { type Announcement, type AppRole, type LeaveStatus, type ReviewStatus, type TrainingStatus } from '@/types/hrms';
import {
  canViewExecutiveCriticalDashboard,
  canViewManagerDashboardWidgets,
  isManager,
} from '@/lib/permissions';
import {
  getDashboardEnabledWidgetIds,
  getDashboardWidgetSpanMap,
  resetDashboardEnabledWidgetIds,
  resetDashboardWidgetSpanMap,
  setDashboardEnabledWidgetIds,
  setDashboardWidgetSpanMap,
  FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY,
  UI_PREFERENCES_CHANGED_EVENT,
} from '@/lib/ui-preferences';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

type DashboardWidgetId =
  | 'attendanceToday'
  | 'leaveBalance'
  | 'announcements'
  | 'trainingSummary'
  | 'performanceSummary'
  | 'teamSnapshot'
  | 'onLeaveToday'
  | 'criticalInsights'
  | 'executiveMetrics';

type DashboardWidgetSpan = 1 | 2 | 3;

interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  label: string;
  description: string;
  defaultSpan: DashboardWidgetSpan;
  minSpan?: DashboardWidgetSpan;
  maxSpan?: DashboardWidgetSpan;
}

interface LeaveRosterItem {
  id: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus | string;
}

interface LeaveRosterQueryRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  employee: { first_name: string | null; last_name: string | null } | null;
  leave_type: { name: string | null } | null;
}

const WIDGET_META: Record<DashboardWidgetId, DashboardWidgetMeta> = {
  attendanceToday: {
    id: 'attendanceToday',
    label: "Today's Attendance",
    description: 'Clock in/out and view your attendance status for today.',
    defaultSpan: 2,
  },
  leaveBalance: {
    id: 'leaveBalance',
    label: 'Leave Balance',
    description: 'Your remaining leave days, usage, and pending requests.',
    defaultSpan: 1,
  },
  announcements: {
    id: 'announcements',
    label: 'Announcements',
    description: 'Latest company updates and notices.',
    defaultSpan: 2,
  },
  trainingSummary: {
    id: 'trainingSummary',
    label: 'Training',
    description: 'Track your training enrollments and completion progress.',
    defaultSpan: 1,
  },
  performanceSummary: {
    id: 'performanceSummary',
    label: 'Performance Reviews',
    description: 'See your review status and recent review activity.',
    defaultSpan: 1,
  },
  teamSnapshot: {
    id: 'teamSnapshot',
    label: 'Team Snapshot',
    description: 'Headcount, present/absent, and on-leave counts for your scope.',
    defaultSpan: 1,
  },
  onLeaveToday: {
    id: 'onLeaveToday',
    label: 'Who Is On Leave Today',
    description: 'See who is currently on leave today in your visible scope.',
    defaultSpan: 2,
  },
  criticalInsights: {
    id: 'criticalInsights',
    label: 'Critical Insights',
    description: 'Risk and exception signals for operational leadership.',
    defaultSpan: 2,
  },
  executiveMetrics: {
    id: 'executiveMetrics',
    label: 'Executive Metrics',
    description: 'High-signal workforce, leave, training, and review KPIs.',
    defaultSpan: 1,
  },
};

const ROLE_WIDGETS: Record<AppRole, DashboardWidgetId[]> = {
  employee: ['attendanceToday', 'leaveBalance', 'trainingSummary', 'performanceSummary', 'announcements'],
  manager: ['attendanceToday', 'leaveBalance', 'trainingSummary', 'performanceSummary', 'teamSnapshot', 'onLeaveToday', 'announcements'],
  general_manager: [
    'attendanceToday',
    'leaveBalance',
    'trainingSummary',
    'performanceSummary',
    'teamSnapshot',
    'onLeaveToday',
    'criticalInsights',
    'executiveMetrics',
    'announcements',
  ],
  hr: [
    'attendanceToday',
    'leaveBalance',
    'trainingSummary',
    'performanceSummary',
    'teamSnapshot',
    'onLeaveToday',
    'criticalInsights',
    'executiveMetrics',
    'announcements',
  ],
  director: [
    'attendanceToday',
    'leaveBalance',
    'trainingSummary',
    'performanceSummary',
    'teamSnapshot',
    'onLeaveToday',
    'criticalInsights',
    'executiveMetrics',
    'announcements',
  ],
  admin: [
    'attendanceToday',
    'announcements',
    'teamSnapshot',
    'onLeaveToday',
    'criticalInsights',
    'executiveMetrics',
  ],
};

const ROLE_DEFAULT_WIDGETS: Record<AppRole, DashboardWidgetId[]> = {
  employee: ['attendanceToday', 'leaveBalance', 'trainingSummary', 'performanceSummary', 'announcements'],
  manager: ['attendanceToday', 'leaveBalance', 'teamSnapshot', 'onLeaveToday', 'announcements', 'trainingSummary', 'performanceSummary'],
  general_manager: ['criticalInsights', 'executiveMetrics', 'teamSnapshot', 'onLeaveToday', 'attendanceToday', 'leaveBalance', 'announcements'],
  hr: ['criticalInsights', 'executiveMetrics', 'teamSnapshot', 'onLeaveToday', 'attendanceToday', 'leaveBalance', 'announcements'],
  director: ['criticalInsights', 'executiveMetrics', 'teamSnapshot', 'onLeaveToday', 'attendanceToday', 'leaveBalance', 'announcements'],
  admin: ['criticalInsights', 'executiveMetrics', 'teamSnapshot', 'onLeaveToday', 'announcements', 'attendanceToday'],
};

function formatRoleLabel(role: AppRole | null | undefined) {
  if (!role) return 'Employee';
  if (role === 'general_manager') return 'General Manager';
  if (role === 'hr') return 'HR';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampWidgetSpan(value: number, widgetId?: DashboardWidgetId): DashboardWidgetSpan {
  const meta = widgetId ? WIDGET_META[widgetId] : undefined;
  const min = meta?.minSpan ?? 1;
  const max = meta?.maxSpan ?? 3;
  const rounded = Math.round(value);
  if (rounded <= min) return min;
  if (rounded >= max) return max;
  return rounded as DashboardWidgetSpan;
}

function getWidgetSpanClass(span: DashboardWidgetSpan) {
  if (span === 3) return 'xl:col-span-3';
  if (span === 2) return 'xl:col-span-2';
  return 'xl:col-span-1';
}

function getScopeLabel(role: AppRole | null | undefined, stats?: ExecutiveStats | null) {
  if (role === 'manager') {
    return stats?.departmentName ? `${stats.departmentName} department` : 'your department';
  }
  if (role === 'general_manager') return 'operations scope';
  if (role === 'hr') return 'people operations scope';
  if (role === 'director') return 'organization-wide';
  if (role === 'admin') return 'organization overview';
  return 'your account';
}

function getCriticalWidgetTitle(role: AppRole | null | undefined) {
  switch (role) {
    case 'general_manager':
      return 'GM Critical Watch';
    case 'hr':
      return 'HR Critical Watch';
    case 'director':
      return 'Director Critical Watch';
    case 'admin':
      return 'System Admin Oversight';
    default:
      return 'Critical Insights';
  }
}

function DashboardWidgetCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('card-stat flex h-full flex-col border-border/60 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 break-words leading-tight">{title}</span>
            </CardTitle>
            {description ? <CardDescription className="mt-2 text-xs md:text-sm">{description}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0 self-start sm:self-auto">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">{children}</CardContent>
    </Card>
  );
}

function MetricChip({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const toneClass = {
    default: 'border-border/60 bg-muted/20 text-foreground',
    success: 'border-success/20 bg-success/10 text-success',
    warning: 'border-warning/20 bg-warning/10 text-warning',
    danger: 'border-destructive/20 bg-destructive/10 text-destructive',
    info: 'border-info/20 bg-info/10 text-info',
  }[tone];

  return (
    <div className={cn('rounded-xl border px-3 py-2', toneClass)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold leading-none">{value}</p>
    </div>
  );
}

function useDashboardOnLeaveTodayRoster() {
  const { user, role, profile } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const managerRole = isManager(role);
  const canViewTeamWidgets = canViewManagerDashboardWidgets(role);

  return useQuery({
    queryKey: ['dashboard', 'on-leave-today-roster', role, profile?.department_id, today],
    queryFn: async (): Promise<LeaveRosterItem[]> => {
      let departmentEmployeeIds: string[] | null = null;

      if (managerRole && profile?.department_id) {
        const { data: employees, error: employeeError } = await supabase
          .from('profiles')
          .select('id')
          .eq('department_id', profile.department_id)
          .eq('status', 'active');

        if (employeeError) throw employeeError;

        departmentEmployeeIds = (employees ?? []).map((row) => row.id);
        if (departmentEmployeeIds.length === 0) return [];
      }

      let query = supabase
        .from('leave_requests')
        .select(`
          id,
          employee_id,
          start_date,
          end_date,
          status,
          employee:profiles!leave_requests_employee_id_fkey(first_name,last_name),
          leave_type:leave_types(name)
        `)
        .not('final_approved_at', 'is', null)
        .not('status', 'in', '(cancelled,rejected)')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: true })
        .limit(12);

      if (departmentEmployeeIds) {
        query = query.in('employee_id', departmentEmployeeIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as unknown as LeaveRosterQueryRow[]).map((row) => ({
        id: row.id,
        employeeName: `${row.employee?.first_name ?? ''} ${row.employee?.last_name ?? ''}`.trim() || 'Employee',
        leaveTypeName: row.leave_type?.name ?? 'Leave',
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
      }));
    },
    enabled: !!user && canViewTeamWidgets,
    staleTime: 60_000,
  });
}

function AttendanceTodayWidget() {
  const { data: todayAttendance } = useTodayAttendance();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const isClocking = clockIn.isPending || clockOut.isPending;

  const statusTone = !todayAttendance
    ? 'warning'
    : todayAttendance.clock_out
      ? 'success'
      : 'info';

  return (
    <DashboardWidgetCard
      title="Today's Attendance"
      description="Clock in/out and review your attendance status for today."
      icon={Clock}
      action={
        <Badge className={cn('rounded-full px-2.5 py-1 text-xs', {
          'badge-warning': statusTone === 'warning',
          'badge-success': statusTone === 'success',
          'badge-info': statusTone === 'info',
        })}>
          {!todayAttendance ? 'Not Clocked In' : todayAttendance.clock_out ? 'Completed' : 'Clocked In'}
        </Badge>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MetricChip
              label="Clock In"
              value={todayAttendance?.clock_in ? format(new Date(todayAttendance.clock_in), 'h:mm a') : '—'}
              tone={todayAttendance?.clock_in ? 'success' : 'default'}
            />
            <MetricChip
              label="Clock Out"
              value={todayAttendance?.clock_out ? format(new Date(todayAttendance.clock_out), 'h:mm a') : '—'}
              tone={todayAttendance?.clock_out ? 'info' : 'default'}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {!todayAttendance
              ? "You haven't clocked in today yet."
              : todayAttendance.clock_out
                ? 'Your attendance for today is complete.'
                : 'You are currently clocked in.'}
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          {!todayAttendance ? (
            <Button
              onClick={() => clockIn.mutate()}
              disabled={isClocking}
              className="h-10 w-full rounded-lg bg-success hover:bg-success/90 sm:w-auto"
            >
              {clockIn.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Clock In
            </Button>
          ) : !todayAttendance.clock_out ? (
            <Button
              onClick={() => clockOut.mutate()}
              disabled={isClocking}
              variant="destructive"
              className="h-10 w-full rounded-lg sm:w-auto"
            >
              {clockOut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
              Clock Out
            </Button>
          ) : (
            <Button variant="outline" className="h-10 w-full rounded-lg sm:w-auto" disabled>
              <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
              Completed Today
            </Button>
          )}
        </div>
      </div>
    </DashboardWidgetCard>
  );
}

function LeaveBalanceWidget() {
  const navigate = useNavigate();
  const { data: balances, isLoading } = useLeaveBalance();

  const summary = useMemo(() => {
    if (!balances?.length) {
      return { allowed: 0, used: 0, pending: 0, remaining: 0 };
    }

    return balances.reduce(
      (acc, balance) => {
        acc.allowed += balance.days_allowed;
        acc.used += balance.days_used;
        acc.pending += balance.days_pending;
        acc.remaining += balance.days_remaining;
        return acc;
      },
      { allowed: 0, used: 0, pending: 0, remaining: 0 },
    );
  }, [balances]);

  const utilization = summary.allowed > 0 ? clampPercent((summary.used / summary.allowed) * 100) : 0;

  return (
    <DashboardWidgetCard
      title="Leave Balance"
      description="Your approved and pending leave usage across available leave types."
      icon={Calendar}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/leave')}>
          Open
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-4 rounded-md" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricChip label="Remaining" value={summary.remaining} tone={summary.remaining > 0 ? 'success' : 'warning'} />
            <MetricChip label="Pending" value={summary.pending} tone={summary.pending > 0 ? 'warning' : 'default'} />
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Annual utilization</span>
              <span className="text-muted-foreground">{summary.used}/{summary.allowed || 0} days</span>
            </div>
            <Progress value={utilization} className="h-2.5" />
            <p className="text-xs text-muted-foreground">{utilization}% of available leave allocation used</p>
          </div>

          {(balances?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
              No leave balance records available yet.
            </div>
          ) : (
            <div className="max-h-[170px] space-y-2 overflow-y-auto pr-1 xl:max-h-[112px] xl:pr-2">
                {(balances ?? []).map((balance) => (
                  <div key={balance.leave_type_id} className="rounded-xl border border-border/60 bg-background/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{balance.leave_type_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {balance.days_used} used • {balance.days_pending} pending
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-2.5 py-1">
                        {balance.days_remaining} left
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function AnnouncementsWidget() {
  const navigate = useNavigate();
  const { data: announcements, isLoading } = useAnnouncements();

  const priorityColor: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    normal: 'badge-info',
    high: 'badge-warning',
    urgent: 'badge-destructive',
  };

  return (
    <DashboardWidgetCard
      title="Announcements"
      description="Latest company updates and internal notices relevant to all staff."
      icon={Megaphone}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/announcements')}>
          View All
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (announcements?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
          No announcements available right now.
        </div>
      ) : (
        <div className="space-y-3">
          {(announcements ?? []).slice(0, 3).map((announcement: Announcement) => (
            <div key={announcement.id} className="rounded-xl border border-border/60 bg-background/80 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold sm:text-base">{announcement.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{announcement.content}</p>
                </div>
                <Badge className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs capitalize', priorityColor[announcement.priority] || priorityColor.normal)}>
                  {announcement.priority}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {announcement.published_at ? format(new Date(announcement.published_at), 'MMM d, yyyy') : 'Draft'}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function TrainingSummaryWidget() {
  const navigate = useNavigate();
  const { data: enrollments, isLoading } = useMyEnrollments();

  const summary = useMemo(() => {
    const items = enrollments ?? [];
    const active = items.filter((item) => ['enrolled', 'in_progress'].includes(item.status)).length;
    const completed = items.filter((item) => item.status === 'completed').length;
    const inProgress = items.find((item) => item.status === 'in_progress');
    const nextQueued = items.find((item) => item.status === 'enrolled');
    return { active, completed, inProgress, nextQueued, total: items.length };
  }, [enrollments]);

  return (
    <DashboardWidgetCard
      title="Training"
      description="Track your active training assignments and completion progress."
      icon={GraduationCap}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/training')}>
          Open Training
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricChip label="Active" value={summary.active} tone={summary.active > 0 ? 'info' : 'default'} />
            <MetricChip label="Completed" value={summary.completed} tone={summary.completed > 0 ? 'success' : 'default'} />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next Training Focus</p>
            <p className="mt-2 text-sm font-medium leading-tight">
              {summary.inProgress?.program?.title || summary.nextQueued?.program?.title || 'No active training assignments'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.inProgress
                ? 'Currently in progress'
                : summary.nextQueued
                  ? 'Enrolled and ready to start'
                  : summary.total > 0
                    ? 'No pending actions right now'
                    : 'You are not enrolled in any programs yet'}
            </p>
          </div>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function PerformanceSummaryWidget() {
  const navigate = useNavigate();
  const { data: reviews, isLoading } = useMyReviews();

  const summary = useMemo(() => {
    const items = reviews ?? [];
    const counts: Record<ReviewStatus, number> = { draft: 0, submitted: 0, acknowledged: 0 };
    items.forEach((item) => {
      if (item.status in counts) {
        counts[item.status as ReviewStatus] += 1;
      }
    });
    const latest = items[0] ?? null;
    return { counts, latest, total: items.length };
  }, [reviews]);

  return (
    <DashboardWidgetCard
      title="Performance Reviews"
      description="Your review progress and latest performance review status."
      icon={ClipboardList}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/performance')}>
          Open Reviews
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <MetricChip label="Draft" value={summary.counts.draft} tone={summary.counts.draft > 0 ? 'warning' : 'default'} />
            <MetricChip label="Submitted" value={summary.counts.submitted} tone={summary.counts.submitted > 0 ? 'info' : 'default'} />
            <MetricChip label="Acknowledged" value={summary.counts.acknowledged} tone={summary.counts.acknowledged > 0 ? 'success' : 'default'} />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest Review</p>
            {summary.latest ? (
              <>
                <p className="mt-2 text-sm font-medium">{summary.latest.review_period || 'Review Period'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2.5 py-1 capitalize">
                    {summary.latest.status}
                  </Badge>
                  {summary.latest.overall_rating ? (
                    <Badge className="badge-info rounded-full px-2.5 py-1">Rating {summary.latest.overall_rating}/5</Badge>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No reviews assigned yet.</p>
            )}
          </div>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function TeamSnapshotWidget({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useExecutiveStats();
  const scopeLabel = getScopeLabel(role, stats ?? null);

  if (isLoading) {
    return (
      <DashboardWidgetCard
        title={role === 'manager' ? 'Dept Snapshot' : 'Operational Snapshot'}
        description={`Attendance and staffing visibility for ${scopeLabel}.`}
        icon={Users}
      >
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </DashboardWidgetCard>
    );
  }

  if (!stats) return null;

  const totalScopeEmployees = role === 'manager' ? (stats.departmentEmployeeCount ?? stats.activeEmployees) : stats.activeEmployees;

  return (
    <DashboardWidgetCard
      title={role === 'manager' ? 'Dept Snapshot' : 'Operational Snapshot'}
      description={`Total staffing and daily attendance for ${scopeLabel}.`}
      icon={Users}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/attendance')}>
          Attendance
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricChip label={role === 'manager' ? 'Dept. Employees' : 'Active Staff'} value={totalScopeEmployees} tone="info" />
        <MetricChip label="Present" value={stats.presentToday} tone="success" />
        <MetricChip label="Absent" value={stats.absentToday} tone={stats.absentToday > 0 ? 'warning' : 'default'} />
        <MetricChip label="On Leave" value={stats.onLeaveToday} tone="info" />
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Attendance Rate Today</p>
            <p className="text-xs text-muted-foreground">Monthly average: {stats.avgAttendanceThisMonth}%</p>
          </div>
          <Badge className={cn('rounded-full px-2.5 py-1', {
            'badge-success': stats.attendanceRate >= 85,
            'badge-warning': stats.attendanceRate >= 70 && stats.attendanceRate < 85,
            'badge-destructive': stats.attendanceRate < 70,
          })}>
            {stats.attendanceRate}%
          </Badge>
        </div>
        <Progress value={clampPercent(stats.attendanceRate)} className="mt-3 h-2.5" />
      </div>
    </DashboardWidgetCard>
  );
}

function OnLeaveTodayWidget({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { data: roster, isLoading } = useDashboardOnLeaveTodayRoster();
  const { data: stats } = useExecutiveStats();
  const scopeLabel = getScopeLabel(role, stats ?? null);

  return (
    <DashboardWidgetCard
      title="Who Is On Leave Today"
      description={`Live leave roster for ${scopeLabel}.`}
      icon={CalendarDays}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/calendar')}>
          Team Calendar
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (roster?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
          No one is on leave today in your current scope.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing up to 12 records</span>
            <span>{stats?.onLeaveToday ?? roster?.length ?? 0} total on leave today</span>
          </div>
          {(roster ?? []).map((person) => (
            <div key={person.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{person.employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  {person.leaveTypeName} • {format(new Date(person.startDate), 'MMM d')} – {format(new Date(person.endDate), 'MMM d')}
                </p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-2.5 py-1 capitalize">
                {person.status.replaceAll('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function ExecutiveMetricsWidget({ role }: { role: AppRole }) {
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

function CriticalInsightsWidget({ role }: { role: AppRole }) {
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
                <Button variant="outline" size="sm" className="h-8 w-full rounded-full sm:w-auto" onClick={() => navigate(alert.route!)}>
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

function DashboardWidgetRenderer({ widgetId, role }: { widgetId: DashboardWidgetId; role: AppRole }) {
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

export default function Dashboard() {
  const { user, profile, role } = useAuth();
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [enabledWidgetIds, setEnabledWidgetIdsState] = useState<DashboardWidgetId[]>([]);
  const [widgetSpanMap, setWidgetSpanMapState] = useState<Record<DashboardWidgetId, DashboardWidgetSpan>>({} as Record<DashboardWidgetId, DashboardWidgetSpan>);
  const [draggingWidgetId, setDraggingWidgetId] = useState<DashboardWidgetId | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<DashboardWidgetId | null>(null);
  const navigate = useNavigate();

  const normalizedRole: AppRole = role ?? 'employee';
  const availableWidgetIds = ROLE_WIDGETS[normalizedRole];
  const defaultWidgetIds = ROLE_DEFAULT_WIDGETS[normalizedRole];
  const defaultWidgetSpanMap = useMemo(
    () =>
      Object.fromEntries(
        availableWidgetIds.map((widgetId) => [widgetId, WIDGET_META[widgetId].defaultSpan]),
      ) as Record<DashboardWidgetId, DashboardWidgetSpan>,
    [availableWidgetIds],
  );
  const canViewTeamWidgets = canViewManagerDashboardWidgets(normalizedRole);
  const canViewCriticalWidgets = canViewExecutiveCriticalDashboard(normalizedRole);

  useEffect(() => {
    if (!user?.id || !normalizedRole) return;

    setEnabledWidgetIdsState(
      getDashboardEnabledWidgetIds(user.id, normalizedRole, availableWidgetIds, defaultWidgetIds) as DashboardWidgetId[],
    );
    setWidgetSpanMapState(
      getDashboardWidgetSpanMap(user.id, normalizedRole, availableWidgetIds, defaultWidgetSpanMap) as Record<DashboardWidgetId, DashboardWidgetSpan>,
    );
  }, [user?.id, normalizedRole, availableWidgetIds, defaultWidgetIds, defaultWidgetSpanMap]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id || !normalizedRole) return;

    const sync = () => {
      setEnabledWidgetIdsState(
        getDashboardEnabledWidgetIds(user.id, normalizedRole, availableWidgetIds, defaultWidgetIds) as DashboardWidgetId[],
      );
      setWidgetSpanMapState(
        getDashboardWidgetSpanMap(user.id, normalizedRole, availableWidgetIds, defaultWidgetSpanMap) as Record<DashboardWidgetId, DashboardWidgetSpan>,
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY ||
        event.key.includes(`hrms.ui.dashboard.widgets.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.dashboard.widgetSpans.${user.id}.${normalizedRole}`)
      ) {
        sync();
      }
    };

    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, sync as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, sync as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id, normalizedRole, availableWidgetIds, defaultWidgetIds, defaultWidgetSpanMap]);

  const orderedEnabledWidgetIds = useMemo(() => {
    const allowedSet = new Set(availableWidgetIds);
    const seen = new Set<DashboardWidgetId>();
    return enabledWidgetIds.filter((id): id is DashboardWidgetId => {
      if (!allowedSet.has(id as DashboardWidgetId)) return false;
      const typedId = id as DashboardWidgetId;
      if (seen.has(typedId)) return false;
      seen.add(typedId);
      return true;
    });
  }, [availableWidgetIds, enabledWidgetIds]);

  const hiddenWidgetCount = availableWidgetIds.length - orderedEnabledWidgetIds.length;
  const hiddenWidgetIds = useMemo(
    () => availableWidgetIds.filter((widgetId) => !orderedEnabledWidgetIds.includes(widgetId)),
    [availableWidgetIds, orderedEnabledWidgetIds],
  );
  const scopeLabel = getScopeLabel(normalizedRole, null);
  const resolvedWidgetSpanMap = useMemo(() => {
    const next = { ...defaultWidgetSpanMap } as Record<DashboardWidgetId, DashboardWidgetSpan>;
    for (const widgetId of availableWidgetIds) {
      next[widgetId] = clampWidgetSpan(widgetSpanMap[widgetId] ?? defaultWidgetSpanMap[widgetId], widgetId);
    }
    return next;
  }, [availableWidgetIds, defaultWidgetSpanMap, widgetSpanMap]);

  const handleToggleWidget = (widgetId: DashboardWidgetId, enabled: boolean) => {
    if (!user?.id) return;

    const allowedSet = new Set(availableWidgetIds);
    const currentOrdered = orderedEnabledWidgetIds.filter((id) => allowedSet.has(id));
    const nextEnabled = enabled
      ? currentOrdered.includes(widgetId)
        ? currentOrdered
        : [...currentOrdered, widgetId]
      : currentOrdered.filter((id) => id !== widgetId);

    const normalizedEnabled = [...new Set(nextEnabled)].filter((id) => allowedSet.has(id));
    setEnabledWidgetIdsState(normalizedEnabled);
    setDashboardEnabledWidgetIds(user.id, normalizedRole, normalizedEnabled);
  };

  const handleMoveWidget = (widgetId: DashboardWidgetId, direction: 'up' | 'down') => {
    if (!user?.id) return;

    const current = [...orderedEnabledWidgetIds];
    const index = current.indexOf(widgetId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
    setEnabledWidgetIdsState(current);
    setDashboardEnabledWidgetIds(user.id, normalizedRole, current);
  };

  const handleReorderVisibleWidgets = (sourceId: DashboardWidgetId, targetId: DashboardWidgetId) => {
    if (!user?.id || sourceId === targetId) return;

    const current = [...orderedEnabledWidgetIds];
    const sourceIndex = current.indexOf(sourceId);
    const targetIndex = current.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, sourceId);
    setEnabledWidgetIdsState(current);
    setDashboardEnabledWidgetIds(user.id, normalizedRole, current);
  };

  const handleSetWidgetSpan = (widgetId: DashboardWidgetId, span: DashboardWidgetSpan) => {
    if (!user?.id) return;

    const normalized = clampWidgetSpan(span, widgetId);
    const next = {
      ...resolvedWidgetSpanMap,
      [widgetId]: normalized,
    };
    setWidgetSpanMapState(next);
    setDashboardWidgetSpanMap(user.id, normalizedRole, next);
  };

  const handleResetWidgets = () => {
    if (!user?.id) return;
    setEnabledWidgetIdsState(defaultWidgetIds);
    setWidgetSpanMapState(defaultWidgetSpanMap);
    resetDashboardEnabledWidgetIds(user.id, normalizedRole);
    resetDashboardWidgetSpanMap(user.id, normalizedRole);
    setDraggingWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleWidgetDragStart = (widgetId: DashboardWidgetId) => (event: DragEvent<HTMLButtonElement>) => {
    if (!isLayoutEditing) {
      event.preventDefault();
      return;
    }
    setDraggingWidgetId(widgetId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', widgetId);
  };

  const handleWidgetDragOver = (widgetId: DashboardWidgetId) => (event: DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing || !draggingWidgetId || draggingWidgetId === widgetId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverWidgetId(widgetId);
  };

  const handleWidgetDrop = (widgetId: DashboardWidgetId) => (event: DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing) return;
    event.preventDefault();
    const source = draggingWidgetId || (event.dataTransfer.getData('text/plain') as DashboardWidgetId | '');
    if (!source || source === widgetId) {
      setDraggingWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }
    handleReorderVisibleWidgets(source as DashboardWidgetId, widgetId);
    setDraggingWidgetId(null);
    setDragOverWidgetId(null);
  };

  const resetDragState = () => {
    setDraggingWidgetId(null);
    setDragOverWidgetId(null);
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <Card className="card-stat overflow-hidden border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-background to-accent/10 p-3.5 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1 space-y-1">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Welcome back, {profile?.first_name || 'there'}!
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')} • {formatRoleLabel(normalizedRole)} dashboard • {scopeLabel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {canViewTeamWidgets && (
                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                      Team visibility enabled
                    </Badge>
                  )}
                  {canViewCriticalWidgets && (
                    <Badge className="badge-info rounded-full px-2 py-0.5 text-[11px]">Critical insights enabled</Badge>
                  )}
                  {hiddenWidgetCount > 0 && (
                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                      {hiddenWidgetCount} hidden widget{hiddenWidgetCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[320px] lg:self-center">
                <Button variant="outline" className="h-9 rounded-xl sm:min-w-[150px]" onClick={() => navigate('/notifications')}>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Button>
                <Button
                  className="h-9 rounded-xl sm:min-w-[170px]"
                  variant={isLayoutEditing ? 'outline' : 'default'}
                  onClick={() => setIsLayoutEditing((value) => !value)}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  {isLayoutEditing ? 'Done Editing' : 'Edit Dashboard'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLayoutEditing ? (
        <Card className="card-stat border-border/60 shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full px-2.5 py-1">
                    <GripVertical className="mr-1.5 h-3.5 w-3.5" />
                    Edit mode
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-1">
                    Drag widgets to reorder
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-1">
                    Resize widgets inline
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                  Use the controls on each widget to drag, resize, or hide it. Hidden widgets can be restored below.
                </p>
              </div>
              <Button variant="outline" className="h-9 rounded-lg md:shrink-0" onClick={handleResetWidgets}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset Role Defaults
              </Button>
            </div>

            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Hidden Widgets</p>
                  <p className="text-xs text-muted-foreground">
                    Restore widgets for your {formatRoleLabel(normalizedRole)} dashboard.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit rounded-full px-2.5 py-1">
                  {hiddenWidgetCount} hidden
                </Badge>
              </div>
              {hiddenWidgetIds.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">All available widgets are currently visible.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {hiddenWidgetIds.map((widgetId) => (
                    <Button
                      key={widgetId}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => handleToggleWidget(widgetId, true)}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {WIDGET_META[widgetId].label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {orderedEnabledWidgetIds.length === 0 ? (
        <Card className="card-stat border-border/60 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20">
              <Filter className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No dashboard widgets visible</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have hidden all widgets for this role. Enable edit mode to restore widgets or reset the role defaults.
            </p>
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Button className="rounded-lg" onClick={() => setIsLayoutEditing(true)}>
                Edit Dashboard
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={handleResetWidgets}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:grid-flow-dense">
          {orderedEnabledWidgetIds.map((widgetId) => (
            <div
              key={widgetId}
              onDragOver={handleWidgetDragOver(widgetId)}
              onDrop={handleWidgetDrop(widgetId)}
              onDragEnd={resetDragState}
              className={cn(
                'space-y-0 h-full',
                getWidgetSpanClass(resolvedWidgetSpanMap[widgetId] ?? WIDGET_META[widgetId].defaultSpan),
                isLayoutEditing && 'rounded-2xl border border-transparent p-1.5 transition-colors',
                isLayoutEditing && draggingWidgetId === widgetId && 'opacity-70',
                isLayoutEditing && dragOverWidgetId === widgetId && draggingWidgetId !== widgetId && 'border-primary/40 bg-primary/5',
              )}
            >
              {isLayoutEditing ? (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/80 p-2 shadow-sm backdrop-blur">
                  <div className="flex min-w-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      draggable
                      onDragStart={handleWidgetDragStart(widgetId)}
                      onDragEnd={resetDragState}
                      className="h-8 w-8 cursor-grab rounded-lg text-muted-foreground active:cursor-grabbing"
                      aria-label={`Drag ${WIDGET_META[widgetId].label}`}
                      title={`Drag ${WIDGET_META[widgetId].label} to reorder`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{WIDGET_META[widgetId].label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {resolvedWidgetSpanMap[widgetId] === 1 ? 'Small' : resolvedWidgetSpanMap[widgetId] === 2 ? 'Wide' : 'Full'} width
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
                      {([1, 2, 3] as DashboardWidgetSpan[]).map((span) => (
                        <Button
                          key={span}
                          type="button"
                          variant={resolvedWidgetSpanMap[widgetId] === span ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 rounded-md px-2 text-[11px]"
                          onClick={() => handleSetWidgetSpan(widgetId, span)}
                          aria-label={`Set ${WIDGET_META[widgetId].label} width to ${span === 1 ? 'small' : span === 2 ? 'wide' : 'full'}`}
                        >
                          {span === 1 ? 'S' : span === 2 ? 'W' : 'F'}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => handleMoveWidget(widgetId, 'up')}
                      disabled={orderedEnabledWidgetIds.indexOf(widgetId) <= 0}
                      aria-label={`Move ${WIDGET_META[widgetId].label} up`}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => handleMoveWidget(widgetId, 'down')}
                      disabled={orderedEnabledWidgetIds.indexOf(widgetId) === -1 || orderedEnabledWidgetIds.indexOf(widgetId) >= orderedEnabledWidgetIds.length - 1}
                      aria-label={`Move ${WIDGET_META[widgetId].label} down`}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() => handleToggleWidget(widgetId, false)}
                    >
                      Hide
                    </Button>
                  </div>
                </div>
              ) : null}
              <DashboardWidgetRenderer widgetId={widgetId} role={normalizedRole} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
