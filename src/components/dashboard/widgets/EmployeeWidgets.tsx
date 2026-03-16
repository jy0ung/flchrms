/**
 * Employee-facing dashboard widgets:
 * AttendanceTodayWidget, LeaveBalanceWidget, AnnouncementsWidget,
 * TrainingSummaryWidget, PerformanceSummaryWidget
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Briefcase, Calendar, CheckCircle2, Clock, ClipboardList,
  GraduationCap, Loader2, Megaphone, Play, Square,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useMyEnrollments } from '@/hooks/useTraining';
import { useMyReviews } from '@/hooks/usePerformance';
import type { Announcement, AppRole, ReviewStatus, TrainingStatus } from '@/types/hrms';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ContextChip, StatusBadge, TaskEmptyState } from '@/components/system';

import {
  DashboardWidgetCard,
  MetricChip,
  type PendingLeaveApprovalItem,
  type TrainingProgramOverviewItem,
} from './shared';
import {
  clampPercent,
  formatStatusLabel,
  MAX_LEAVE_BALANCE_ROWS_IN_WIDGET,
} from '../dashboard-config';

// ── Attendance Today ─────────────────────────────────────────────

export function AttendanceTodayWidget() {
  const { data: todayAttendance } = useTodayAttendance();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const isClocking = clockIn.isPending || clockOut.isPending;

  const statusMeta = !todayAttendance
    ? { status: 'warning', label: 'Not Clocked In' }
    : todayAttendance.clock_out
      ? { status: 'completed', label: 'Completed' }
      : { status: 'info', label: 'Clocked In' };

  return (
    <DashboardWidgetCard
      title="Today Attendance"
      description="Attendance status and clock activity for today."
      icon={Clock}
      action={<StatusBadge status={statusMeta.status} labelOverride={statusMeta.label} size="md" />}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MetricChip label="Clock In" value={todayAttendance?.clock_in ? format(new Date(todayAttendance.clock_in), 'h:mm a') : '—'} tone={todayAttendance?.clock_in ? 'success' : 'default'} />
            <MetricChip label="Clock Out" value={todayAttendance?.clock_out ? format(new Date(todayAttendance.clock_out), 'h:mm a') : '—'} tone={todayAttendance?.clock_out ? 'info' : 'default'} />
          </div>
          <p className="text-sm text-muted-foreground">
            {!todayAttendance ? "You haven't clocked in today yet."
              : todayAttendance.clock_out ? 'Your attendance for today is complete.'
              : 'You are currently clocked in.'}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {!todayAttendance ? (
            <Button
              onClick={() => clockIn.mutate()}
              disabled={isClocking}
              variant="outline"
              className="h-10 w-full rounded-lg border-success/30 text-foreground hover:bg-success/10 hover:text-foreground sm:w-auto"
            >
              {clockIn.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-success" />
              ) : (
                <Play className="mr-2 h-4 w-4 text-success" />
              )}
              Clock In
            </Button>
          ) : !todayAttendance.clock_out ? (
            <Button onClick={() => clockOut.mutate()} disabled={isClocking} variant="destructive" className="h-10 w-full rounded-lg sm:w-auto">
              {clockOut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
              Clock Out
            </Button>
          ) : (
            <ContextChip tone="success" className="h-10 w-full justify-center sm:w-auto">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Completed Today
            </ContextChip>
          )}
        </div>
      </div>
    </DashboardWidgetCard>
  );
}

// ── Leave Balance ────────────────────────────────────────────────

export function LeaveBalanceWidget() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const normalizedRole: AppRole = role ?? 'employee';
  const isAdminViewer = normalizedRole === 'admin';
  const { data: balances, isLoading } = useLeaveBalance();

  const summary = useMemo(() => {
    if (!balances?.length) return {
      allowed: 0,
      used: 0,
      pending: 0,
      remaining: 0,
      hasUnlimited: false,
    };
    return balances.reduce(
      (acc: { allowed: number; used: number; pending: number; remaining: number; hasUnlimited: boolean }, b: { days_allowed: number; days_used: number; days_pending: number; days_remaining: number; is_unlimited: boolean }) => {
        if (b.is_unlimited) {
          return {
            ...acc,
            used: acc.used + b.days_used,
            pending: acc.pending + b.days_pending,
            hasUnlimited: true,
          };
        }

        return {
          allowed: acc.allowed + b.days_allowed,
          used: acc.used + b.days_used,
          pending: acc.pending + b.days_pending,
          remaining: acc.remaining + b.days_remaining,
          hasUnlimited: acc.hasUnlimited,
        };
      },
      { allowed: 0, used: 0, pending: 0, remaining: 0, hasUnlimited: false },
    );
  }, [balances]);

  const utilization = summary.allowed > 0 ? clampPercent((summary.used / summary.allowed) * 100) : 0;
  const visibleBalances = (balances ?? []).slice(0, MAX_LEAVE_BALANCE_ROWS_IN_WIDGET);
  const remainingBalanceCount = Math.max((balances?.length ?? 0) - visibleBalances.length, 0);

  const { data: pendingApprovals, isLoading: isPendingApprovalsLoading } = useQuery({
    queryKey: ['dashboard', 'pending-leave-approvals', normalizedRole],
    queryFn: async (): Promise<PendingLeaveApprovalItem[]> => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`id, employee_id, start_date, end_date, status, employee:profiles!leave_requests_employee_id_fkey(first_name,last_name), leave_type:leave_types(name)`)
        .is('final_approved_at', null)
        .in('status', ['pending_manager', 'pending_gm', 'pending_director', 'cancellation_pending_manager', 'cancellation_pending_gm', 'cancellation_pending_director'])
        .order('created_at', { ascending: true })
        .limit(4);
      if (error) throw error;
      return ((data ?? []) as unknown as Array<{ id: string; employee_id: string; start_date: string; end_date: string; status: string; employee: { first_name: string | null; last_name: string | null } | null; leave_type: { name: string | null } | null }>).map((row) => ({
        id: row.id, employeeName: `${row.employee?.first_name ?? ''} ${row.employee?.last_name ?? ''}`.trim() || 'Employee',
        leaveTypeName: row.leave_type?.name ?? 'Leave', startDate: row.start_date, endDate: row.end_date, status: row.status,
      }));
    },
    enabled: isAdminViewer,
    staleTime: 60_000,
  });

  if (isAdminViewer) {
    return (
      <DashboardWidgetCard title="Pending Leave Approvals" description="Awaiting management action." icon={Briefcase}
        action={<Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/leave')}>Review Queue</Button>}>
        {isPendingApprovalsLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : (pendingApprovals?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">No pending leave approvals right now.</div>
        ) : (
          <div className="space-y-2">
            {(pendingApprovals ?? []).map((a: PendingLeaveApprovalItem) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.employeeName}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.leaveTypeName} • {format(new Date(a.startDate), 'MMM d')} – {format(new Date(a.endDate), 'MMM d')}</p>
                </div>
                <StatusBadge status={a.status} labelOverride={formatStatusLabel(a.status)} size="sm" />
              </div>
            ))}
          </div>
        )}
      </DashboardWidgetCard>
    );
  }

  return (
    <DashboardWidgetCard title="Leave Balance" description="Your approved and pending leave usage across available leave types." icon={Calendar}
      action={<Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/leave')} aria-label="Manage leave requests and balances">Manage Leave</Button>}>
      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-4 rounded-md" /><Skeleton className="h-20 rounded-lg" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricChip
              label="Remaining"
              value={summary.hasUnlimited ? 'Unlimited' : summary.remaining}
              tone={summary.hasUnlimited || summary.remaining > 0 ? 'success' : 'warning'}
            />
            <MetricChip label="Pending" value={summary.pending} tone={summary.pending > 0 ? 'warning' : 'default'} />
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm"><span className="font-medium">Annual utilization</span><span className="text-muted-foreground">{summary.hasUnlimited ? 'Unlimited balance in scope' : `${summary.used}/${summary.allowed || 0} days`}</span></div>
            <Progress value={utilization} aria-label="Annual leave utilization" className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              {summary.hasUnlimited
                ? 'Utilization excludes unlimited leave types.'
                : `${utilization}% of available leave allocation used`}
            </p>
          </div>
          {(balances?.length ?? 0) === 0 ? (
            <TaskEmptyState
              title="No leave balances yet"
              description="Your leave balance records will appear here once leave types are assigned."
              icon={Calendar}
              compact
            />
          ) : (
            <div className="space-y-2">
              {visibleBalances.map((b) => (
                <div key={b.leave_type_id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{b.leave_type_name}</p><p className="text-xs text-muted-foreground">{b.days_used} used • {b.days_pending} pending</p></div>
                    <Badge variant="outline" className="rounded-full px-2.5 py-1">{b.is_unlimited ? 'Unlimited' : `${b.days_remaining} left`}</Badge>
                  </div>
                </div>
              ))}
              {remainingBalanceCount > 0 && (
                <Button variant="ghost" size="sm" className="h-8 w-full justify-start rounded-lg px-2 text-xs text-muted-foreground" onClick={() => navigate('/leave')}>
                  +{remainingBalanceCount} more leave type{remainingBalanceCount > 1 ? 's' : ''} in Leave Management
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

// ── Announcements ────────────────────────────────────────────────

export function AnnouncementsWidget() {
  const navigate = useNavigate();
  const { data: announcements, isLoading } = useAnnouncements();
  return (
    <DashboardWidgetCard title="Announcements" description="Latest company updates and internal notices relevant to all staff." icon={Megaphone}
      action={<Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/announcements')}>Browse Updates</Button>}>
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : (announcements?.length ?? 0) === 0 ? (
        <TaskEmptyState
          title="No announcements right now"
          description="Company updates will appear here when they are published."
          icon={Megaphone}
          compact
        />
      ) : (
        <div className="space-y-3">
          {(announcements ?? []).slice(0, 3).map((a: Announcement) => (
            <div key={a.id} className="rounded-lg border border-border bg-background p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold sm:text-base">{a.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.content}</p></div>
                <StatusBadge status={a.priority} className="shrink-0" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{a.published_at ? format(new Date(a.published_at), 'MMM d, yyyy') : 'Draft'}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

// ── Training Summary ─────────────────────────────────────────────

export function TrainingSummaryWidget() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const normalizedRole: AppRole = role ?? 'employee';
  const isAdminViewer = normalizedRole === 'admin';
  const { data: enrollments, isLoading } = useMyEnrollments();

  const summary = useMemo(() => {
    const items = enrollments ?? [];
    return {
      active: items.filter((i) => ['enrolled', 'in_progress'].includes(i.status)).length,
      completed: items.filter((i) => i.status === 'completed').length,
      inProgress: items.find((i) => i.status === 'in_progress'),
      nextQueued: items.find((i) => i.status === 'enrolled'),
      total: items.length,
    };
  }, [enrollments]);

  const { data: trainingOverview, isLoading: isTrainingOverviewLoading } = useQuery({
    queryKey: ['dashboard', 'training-overview', normalizedRole],
    queryFn: async (): Promise<TrainingProgramOverviewItem[]> => {
      const { data, error } = await supabase.from('training_enrollments').select(`status, program:training_programs(title)`);
      if (error) throw error;
      const acc = new Map<string, { total: number; completed: number }>();
      (data ?? []).forEach((r) => {
        const title = r.program?.title?.trim() || 'Untitled Program';
        const e = acc.get(title) ?? { total: 0, completed: 0 };
        e.total += 1;
        if ((r.status as TrainingStatus) === 'completed') e.completed += 1;
        acc.set(title, e);
      });
      return Array.from(acc.entries()).map(([title, c]) => ({ title, completionRate: c.total > 0 ? clampPercent((c.completed / c.total) * 100) : 0 })).sort((a, b) => b.completionRate - a.completionRate).slice(0, 3);
    },
    enabled: isAdminViewer,
    staleTime: 60_000,
  });

  if (isAdminViewer) {
    return (
      <DashboardWidgetCard title="Training Overview" description="Organization learning completion by program." icon={GraduationCap}>
        {isTrainingOverviewLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : (trainingOverview?.length ?? 0) === 0 ? (
          <TaskEmptyState
            title="No training enrollment data yet"
            description="Completion trends will appear here after enrollment activity starts."
            icon={GraduationCap}
            compact
          />
        ) : (
          <div className="space-y-4">
            {(trainingOverview ?? []).map((p) => (
              <div key={p.title} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm"><span className="truncate font-medium">{p.title}</span><span className="text-muted-foreground">{p.completionRate}%</span></div>
                <Progress value={p.completionRate} aria-label={`${p.title} completion rate`} className="h-2.5" />
              </div>
            ))}
            <div className="rounded-lg border border-info/20 bg-info/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-info">Training Insight</p>
              <p className="mt-1 text-sm text-muted-foreground">Focus on programs below 60% completion to improve organization readiness.</p>
            </div>
          </div>
        )}
      </DashboardWidgetCard>
    );
  }

  return (
    <DashboardWidgetCard title="Training" description="Active training assignments and completion progress." icon={GraduationCap}
      action={<Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/training')}>View Training</Button>}>
      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-14 rounded-lg" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricChip label="Active" value={summary.active} tone={summary.active > 0 ? 'info' : 'default'} />
            <MetricChip label="Completed" value={summary.completed} tone={summary.completed > 0 ? 'success' : 'default'} />
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next Training Focus</p>
            <p className="mt-2 text-sm font-medium leading-tight">{summary.inProgress?.program?.title || summary.nextQueued?.program?.title || 'No active training assignments'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.inProgress ? 'Currently in progress' : summary.nextQueued ? 'Enrolled and ready to start' : summary.total > 0 ? 'No pending actions right now' : 'You are not enrolled in any programs yet'}
            </p>
          </div>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

// ── Performance Summary ──────────────────────────────────────────

export function PerformanceSummaryWidget() {
  const navigate = useNavigate();
  const { data: reviews, isLoading } = useMyReviews();

  const summary = useMemo(() => {
    const items = reviews ?? [];
    const counts: Record<ReviewStatus, number> = { draft: 0, submitted: 0, acknowledged: 0 };
    items.forEach((i) => { if (i.status in counts) counts[i.status as ReviewStatus] += 1; });
    return { counts, latest: items[0] ?? null, total: items.length };
  }, [reviews]);

  return (
    <DashboardWidgetCard title="Performance Reviews" description="Your review progress and latest performance review status." icon={ClipboardList}
      action={<Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/performance')}>View Reviews</Button>}>
      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-14 rounded-lg" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <MetricChip label="Draft" value={summary.counts.draft} tone={summary.counts.draft > 0 ? 'warning' : 'default'} />
            <MetricChip label="Submitted" value={summary.counts.submitted} tone={summary.counts.submitted > 0 ? 'info' : 'default'} />
            <MetricChip label="Acknowledged" value={summary.counts.acknowledged} tone={summary.counts.acknowledged > 0 ? 'success' : 'default'} />
          </div>
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest Review</p>
            {summary.latest ? (
              <>
                <p className="mt-2 text-sm font-medium">{summary.latest.review_period || 'Review Period'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={summary.latest.status} />
                  {summary.latest.overall_rating ? <Badge variant="outline" className="rounded-full px-2.5 py-1">Rating {summary.latest.overall_rating}/5</Badge> : null}
                </div>
              </>
            ) : (
              <TaskEmptyState
                title="No reviews assigned"
                description="New review cycles will show up here when they are scheduled."
                icon={ClipboardList}
                align="start"
                compact
                className="mt-2"
              />
            )}
          </div>
        </div>
      )}
    </DashboardWidgetCard>
  );
}
