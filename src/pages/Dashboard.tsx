import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
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
  Loader2,
  Megaphone,
  Plus,
  Play,
  RefreshCcw,
  Search,
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
import { type LayoutState } from '@/lib/editable-layout';
import {
  SUPPORTED_DASHBOARD_LAYOUT_VERSION,
  TIER_WIDTH_RULES,
  assertDashboardLayoutInvariants,
  buildDefaultDashboardLayoutV2,
  clampWidgetWidthByTier,
  compactLaneWidgets,
  mergeLanesToLayout,
  migrateLegacyDashboardLayoutToV2,
  normalizeDashboardLayoutStateV2,
  splitLayoutByLane,
  type DashboardLayoutStateV2,
  type DashboardTier,
  type DashboardWidgetDefinition,
  type DashboardWidgetId,
  type ResizeRule,
} from '@/lib/dashboard-layout';
import {
  getDashboardEnabledWidgetIds,
  getDashboardLayoutStateV2,
  getDashboardLayoutPresetVersion,
  getDashboardStoredLayoutVersion,
  getDashboardWidgetLayoutState,
  getDashboardWidgetSpanMap,
  setDashboardLayoutPresetVersion,
  setDashboardLayoutStateV2,
  FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY,
  UI_PREFERENCES_CHANGED_EVENT,
} from '@/lib/ui-preferences';
import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AppPageContainer,
  CardHeaderStandard,
  InteractionModeToggle,
  ModeRibbon,
  PageHeader,
  StatusBadge,
  useInteractionMode,
} from '@/components/system';
import { DashboardLane } from '@/components/dashboard/DashboardLane';

interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  label: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultTier: DashboardTier;
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

interface PendingLeaveApprovalItem {
  id: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface PendingLeaveApprovalQueryRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  employee: { first_name: string | null; last_name: string | null } | null;
  leave_type: { name: string | null } | null;
}

interface TrainingProgramOverviewItem {
  title: string;
  completionRate: number;
}

const WIDGET_META: Record<DashboardWidgetId, DashboardWidgetMeta> = {
  attendanceToday: {
    id: 'attendanceToday',
    label: 'Today Attendance',
    description: 'Attendance status and clock activity for today.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  leaveBalance: {
    id: 'leaveBalance',
    label: 'Leave Balance',
    description: 'Leave balances and approval workload visibility.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  announcements: {
    id: 'announcements',
    label: 'Announcements',
    description: 'Latest company updates and notices.',
    defaultWidth: 12,
    defaultHeight: 4,
    defaultTier: 'secondary',
  },
  trainingSummary: {
    id: 'trainingSummary',
    label: 'Training',
    description: 'Training progress and completion insights.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  performanceSummary: {
    id: 'performanceSummary',
    label: 'Performance Reviews',
    description: 'Performance review status and recent activity.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  teamSnapshot: {
    id: 'teamSnapshot',
    label: 'Team Snapshot',
    description: 'Headcount, present/absent, and on-leave counts for your scope.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'secondary',
  },
  onLeaveToday: {
    id: 'onLeaveToday',
    label: 'Who Is On Leave Today',
    description: 'Current leave roster for the visible scope.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'secondary',
  },
  criticalInsights: {
    id: 'criticalInsights',
    label: 'Critical Insights',
    description: 'Risk and exception signals for operational leadership.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'primary',
  },
  executiveMetrics: {
    id: 'executiveMetrics',
    label: 'Executive Metrics',
    description: 'High-signal workforce, leave, training, and review KPIs.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'primary',
  },
};

const WIDGET_ICONS: Record<DashboardWidgetId, ComponentType<{ className?: string }>> = {
  attendanceToday: Clock,
  leaveBalance: Calendar,
  announcements: Megaphone,
  trainingSummary: GraduationCap,
  performanceSummary: ClipboardList,
  teamSnapshot: Users,
  onLeaveToday: CalendarDays,
  criticalInsights: ShieldAlert,
  executiveMetrics: Target,
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
    'criticalInsights',
    'announcements',
    'teamSnapshot',
    'onLeaveToday',
    'leaveBalance',
    'trainingSummary',
  ],
};

const ROLE_DEFAULT_WIDGETS: Record<AppRole, DashboardWidgetId[]> = {
  employee: ['attendanceToday', 'leaveBalance', 'announcements', 'trainingSummary', 'performanceSummary'],
  manager: ['teamSnapshot', 'onLeaveToday', 'announcements', 'attendanceToday', 'leaveBalance', 'trainingSummary', 'performanceSummary'],
  general_manager: ['criticalInsights', 'executiveMetrics', 'announcements', 'teamSnapshot', 'onLeaveToday', 'attendanceToday', 'leaveBalance', 'trainingSummary', 'performanceSummary'],
  hr: ['criticalInsights', 'executiveMetrics', 'announcements', 'teamSnapshot', 'onLeaveToday', 'attendanceToday', 'leaveBalance', 'trainingSummary', 'performanceSummary'],
  director: ['criticalInsights', 'executiveMetrics', 'announcements', 'teamSnapshot', 'onLeaveToday', 'attendanceToday', 'leaveBalance', 'trainingSummary', 'performanceSummary'],
  admin: ['criticalInsights', 'announcements', 'teamSnapshot', 'onLeaveToday', 'leaveBalance', 'trainingSummary'],
};

const ROLE_DEFAULT_WIDGET_WIDTHS: Record<AppRole, Partial<Record<DashboardWidgetId, number>>> = {
  employee: {
    attendanceToday: 8,
    leaveBalance: 4,
    announcements: 12,
    trainingSummary: 8,
    performanceSummary: 4,
  },
  manager: {
    attendanceToday: 8,
    leaveBalance: 4,
    announcements: 12,
    teamSnapshot: 8,
    onLeaveToday: 4,
    trainingSummary: 8,
    performanceSummary: 4,
  },
  general_manager: {
    criticalInsights: 8,
    executiveMetrics: 4,
    announcements: 12,
    teamSnapshot: 8,
    onLeaveToday: 4,
    attendanceToday: 8,
    leaveBalance: 4,
    trainingSummary: 8,
    performanceSummary: 4,
  },
  hr: {
    criticalInsights: 8,
    executiveMetrics: 4,
    announcements: 12,
    teamSnapshot: 8,
    onLeaveToday: 4,
    attendanceToday: 8,
    leaveBalance: 4,
    trainingSummary: 8,
    performanceSummary: 4,
  },
  director: {
    criticalInsights: 8,
    executiveMetrics: 4,
    announcements: 12,
    teamSnapshot: 8,
    onLeaveToday: 4,
    attendanceToday: 8,
    leaveBalance: 4,
    trainingSummary: 8,
    performanceSummary: 4,
  },
  admin: {
    criticalInsights: 12,
    announcements: 12,
    teamSnapshot: 8,
    onLeaveToday: 4,
    leaveBalance: 8,
    trainingSummary: 4,
  },
};

const WIDGET_DEFINITIONS: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  attendanceToday: {
    id: 'attendanceToday',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.attendanceToday.defaultWidth,
    defaultH: WIDGET_META.attendanceToday.defaultHeight,
    minW: TIER_WIDTH_RULES.supporting.minW,
    maxW: TIER_WIDTH_RULES.supporting.maxW,
  },
  leaveBalance: {
    id: 'leaveBalance',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.leaveBalance.defaultWidth,
    defaultH: WIDGET_META.leaveBalance.defaultHeight,
    minW: TIER_WIDTH_RULES.supporting.minW,
    maxW: TIER_WIDTH_RULES.supporting.maxW,
  },
  announcements: {
    id: 'announcements',
    defaultTier: 'secondary',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.announcements.defaultWidth,
    defaultH: WIDGET_META.announcements.defaultHeight,
    minW: TIER_WIDTH_RULES.secondary.minW,
    maxW: TIER_WIDTH_RULES.secondary.maxW,
  },
  trainingSummary: {
    id: 'trainingSummary',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.trainingSummary.defaultWidth,
    defaultH: WIDGET_META.trainingSummary.defaultHeight,
    minW: TIER_WIDTH_RULES.supporting.minW,
    maxW: TIER_WIDTH_RULES.supporting.maxW,
  },
  performanceSummary: {
    id: 'performanceSummary',
    defaultTier: 'supporting',
    allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director'],
    defaultW: WIDGET_META.performanceSummary.defaultWidth,
    defaultH: WIDGET_META.performanceSummary.defaultHeight,
    minW: TIER_WIDTH_RULES.supporting.minW,
    maxW: TIER_WIDTH_RULES.supporting.maxW,
  },
  teamSnapshot: {
    id: 'teamSnapshot',
    defaultTier: 'secondary',
    allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.teamSnapshot.defaultWidth,
    defaultH: WIDGET_META.teamSnapshot.defaultHeight,
    minW: TIER_WIDTH_RULES.secondary.minW,
    maxW: TIER_WIDTH_RULES.secondary.maxW,
  },
  onLeaveToday: {
    id: 'onLeaveToday',
    defaultTier: 'secondary',
    allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.onLeaveToday.defaultWidth,
    defaultH: WIDGET_META.onLeaveToday.defaultHeight,
    minW: TIER_WIDTH_RULES.secondary.minW,
    maxW: TIER_WIDTH_RULES.secondary.maxW,
  },
  criticalInsights: {
    id: 'criticalInsights',
    defaultTier: 'primary',
    allowedRoles: ['general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.criticalInsights.defaultWidth,
    defaultH: WIDGET_META.criticalInsights.defaultHeight,
    minW: TIER_WIDTH_RULES.primary.minW,
    maxW: TIER_WIDTH_RULES.primary.maxW,
  },
  executiveMetrics: {
    id: 'executiveMetrics',
    defaultTier: 'primary',
    allowedRoles: ['general_manager', 'hr', 'director', 'admin'],
    defaultW: WIDGET_META.executiveMetrics.defaultWidth,
    defaultH: WIDGET_META.executiveMetrics.defaultHeight,
    minW: TIER_WIDTH_RULES.primary.minW,
    maxW: TIER_WIDTH_RULES.primary.maxW,
  },
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

function formatStatusLabel(status: string) {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const DASHBOARD_LAYOUT_PRESET_VERSION = 5;
const DASHBOARD_TIERS: DashboardTier[] = ['primary', 'secondary', 'supporting'];

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
  icon: _icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('card-stat flex h-full flex-col border-border/60 shadow-sm', className)}>
      <CardHeaderStandard
        title={title}
        description={description}
        actions={action}
        className="p-6 pb-3"
        titleClassName="text-base md:text-lg"
        descriptionClassName="text-xs md:text-sm"
      />
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
      action={
        <StatusBadge
          status={statusMeta.status}
          labelOverride={statusMeta.label}
          size="md"
        />
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
  const { role } = useAuth();
  const normalizedRole: AppRole = role ?? 'employee';
  const isAdminViewer = normalizedRole === 'admin';
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

  const { data: pendingApprovals, isLoading: isPendingApprovalsLoading } = useQuery({
    queryKey: ['dashboard', 'pending-leave-approvals', normalizedRole],
    queryFn: async (): Promise<PendingLeaveApprovalItem[]> => {
      const { data, error } = await supabase
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
        .is('final_approved_at', null)
        .in('status', [
          'pending_manager',
          'pending_gm',
          'pending_director',
          'cancellation_pending_manager',
          'cancellation_pending_gm',
          'cancellation_pending_director',
        ])
        .order('created_at', { ascending: true })
        .limit(4);

      if (error) throw error;

      return ((data ?? []) as unknown as PendingLeaveApprovalQueryRow[]).map((row) => ({
        id: row.id,
        employeeName: `${row.employee?.first_name ?? ''} ${row.employee?.last_name ?? ''}`.trim() || 'Employee',
        leaveTypeName: row.leave_type?.name ?? 'Leave',
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
      }));
    },
    enabled: isAdminViewer,
    staleTime: 60_000,
  });

  if (isAdminViewer) {
    return (
      <DashboardWidgetCard
        title="Pending Leave Approvals"
        description="Awaiting management action."
        icon={Briefcase}
        action={
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/leave')}>
            View All
          </Button>
        }
      >
        {isPendingApprovalsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (pendingApprovals?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            No pending leave approvals right now.
          </div>
        ) : (
          <div className="space-y-2">
            {(pendingApprovals ?? []).map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{approval.employeeName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {approval.leaveTypeName} • {format(new Date(approval.startDate), 'MMM d')} – {format(new Date(approval.endDate), 'MMM d')}
                  </p>
                </div>
                <StatusBadge status={approval.status} labelOverride={formatStatusLabel(approval.status)} size="sm" />
              </div>
            ))}
          </div>
        )}
      </DashboardWidgetCard>
    );
  }

  return (
    <DashboardWidgetCard
      title="Leave Balance"
      description="Your approved and pending leave usage across available leave types."
      icon={Calendar}
      action={
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => navigate('/leave')}
          aria-label="Open leave management"
        >
          Open Leave
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
                <StatusBadge status={announcement.priority} className="shrink-0" />
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
  const { role } = useAuth();
  const normalizedRole: AppRole = role ?? 'employee';
  const isAdminViewer = normalizedRole === 'admin';
  const { data: enrollments, isLoading } = useMyEnrollments();
  const summary = useMemo(() => {
    const items = enrollments ?? [];
    const active = items.filter((item) => ['enrolled', 'in_progress'].includes(item.status)).length;
    const completed = items.filter((item) => item.status === 'completed').length;
    const inProgress = items.find((item) => item.status === 'in_progress');
    const nextQueued = items.find((item) => item.status === 'enrolled');
    return { active, completed, inProgress, nextQueued, total: items.length };
  }, [enrollments]);

  const { data: trainingOverview, isLoading: isTrainingOverviewLoading } = useQuery({
    queryKey: ['dashboard', 'training-overview', normalizedRole],
    queryFn: async (): Promise<TrainingProgramOverviewItem[]> => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .select(`
          status,
          program:training_programs(title)
        `);

      if (error) throw error;

      const accumulator = new Map<string, { total: number; completed: number }>();

      (data ?? []).forEach((row) => {
        const title = row.program?.title?.trim() || 'Untitled Program';
        const existing = accumulator.get(title) ?? { total: 0, completed: 0 };
        existing.total += 1;
        if ((row.status as TrainingStatus) === 'completed') {
          existing.completed += 1;
        }
        accumulator.set(title, existing);
      });

      return Array.from(accumulator.entries())
        .map(([title, counts]) => ({
          title,
          completionRate: counts.total > 0 ? clampPercent((counts.completed / counts.total) * 100) : 0,
        }))
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 3);
    },
    enabled: isAdminViewer,
    staleTime: 60_000,
  });

  if (isAdminViewer) {
    return (
      <DashboardWidgetCard
        title="Training Overview"
        description="Organization learning completion by program."
        icon={GraduationCap}
      >
        {isTrainingOverviewLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : (trainingOverview?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            No training enrollment data available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {(trainingOverview ?? []).map((program) => (
              <div key={program.title} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{program.title}</span>
                  <span className="text-muted-foreground">{program.completionRate}%</span>
                </div>
                <Progress value={program.completionRate} className="h-2.5" />
              </div>
            ))}

            <div className="rounded-xl border border-info/20 bg-info/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-info">Training Insight</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Focus on programs below 60% completion to improve organization readiness.
              </p>
            </div>
          </div>
        )}
      </DashboardWidgetCard>
    );
  }

  return (
    <DashboardWidgetCard
      title="Training"
      description="Active training assignments and completion progress."
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
                  <StatusBadge status={summary.latest.status} />
                  {summary.latest.overall_rating ? (
                    <Badge variant="outline" className="rounded-full px-2.5 py-1">
                      Rating {summary.latest.overall_rating}/5
                    </Badge>
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
  const title = role === 'manager' ? 'Dept Snapshot' : role === 'admin' ? 'Live Attendance Status' : 'Operational Snapshot';
  const description = role === 'admin'
    ? 'Real-time tracking for today.'
    : `Attendance and staffing visibility for ${scopeLabel}.`;

  if (isLoading) {
    return (
      <DashboardWidgetCard
        title={title}
        description={description}
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

      <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-3">
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

function OnLeaveTodayWidget({ role }: { role: AppRole }) {
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
            <div key={person.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
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
  const { is, setMode } = useInteractionMode();
  const isLayoutEditing = is('customize');
  const [layoutState, setLayoutState] = useState<DashboardLayoutStateV2 | null>(null);
  const layoutStateRef = useRef<DashboardLayoutStateV2 | null>(null);
  const navigate = useNavigate();

  const normalizedRole: AppRole = role ?? 'employee';
  const availableWidgetIds = ROLE_WIDGETS[normalizedRole];
  const defaultWidgetIds = ROLE_DEFAULT_WIDGETS[normalizedRole];
  const defaultDimensionsById = useMemo(() => {
    const roleDefaultWidths = ROLE_DEFAULT_WIDGET_WIDTHS[normalizedRole];
    return Object.fromEntries(
      availableWidgetIds.map((widgetId) => [
        widgetId,
        {
          w: roleDefaultWidths?.[widgetId] ?? WIDGET_META[widgetId].defaultWidth,
          h: WIDGET_META[widgetId].defaultHeight,
        },
      ]),
    );
  }, [availableWidgetIds, normalizedRole]);
  const canViewTeamWidgets = canViewManagerDashboardWidgets(normalizedRole);
  const canViewCriticalWidgets = canViewExecutiveCriticalDashboard(normalizedRole);

  const persistLayoutState = useCallback((nextState: DashboardLayoutStateV2) => {
    if (!user?.id) return;
    setDashboardLayoutStateV2(user.id, normalizedRole, nextState);
    setDashboardLayoutPresetVersion(user.id, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
  }, [user?.id, normalizedRole]);

  const buildDefaultLayout = useCallback(() => {
    return buildDefaultDashboardLayoutV2({
      definitions: WIDGET_DEFINITIONS,
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      orderedWidgetIds: defaultWidgetIds,
      defaultDimensionsById,
      rulesByTier: TIER_WIDTH_RULES,
    });
  }, [defaultDimensionsById, defaultWidgetIds, normalizedRole]);

  const applyPresetOrderToLayout = useCallback((current: DashboardLayoutStateV2): DashboardLayoutStateV2 => {
    const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
    const orderIndex = new Map(defaultWidgetIds.map((id, index) => [id, index]));

    const reordered: Partial<Record<DashboardTier, typeof lanes.primary>> = {};
    for (const tier of DASHBOARD_TIERS) {
      const laneWidgets = lanes[tier];
      const visibleWidgets = laneWidgets
        .filter((widget) => widget.visible)
        .sort((a, b) => {
          const aOrder = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const bOrder = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          if (a.y !== b.y) return a.y - b.y;
          return a.x - b.x;
        })
        .map((widget, index) => ({ ...widget, x: 0, y: index }));
      const compactedVisible = compactLaneWidgets(visibleWidgets, tier, TIER_WIDTH_RULES);
      const compactedById = new Map(compactedVisible.map((widget) => [widget.id, widget]));

      reordered[tier] = laneWidgets.map((widget) => {
        if (!widget.visible) return widget;
        const compacted = compactedById.get(widget.id);
        return compacted ? { ...widget, ...compacted } : widget;
      });
    }

    return normalizeDashboardLayoutStateV2({
      state: mergeLanesToLayout(reordered, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION),
      definitions: WIDGET_DEFINITIONS,
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      rulesByTier: TIER_WIDTH_RULES,
    });
  }, [defaultWidgetIds, normalizedRole]);

  const setAndPersistLayout = useCallback((nextState: DashboardLayoutStateV2, shouldPersist = true) => {
    layoutStateRef.current = nextState;
    setLayoutState(nextState);
    if (shouldPersist) {
      persistLayoutState(nextState);
    }
  }, [persistLayoutState]);

  const syncFromStorage = useCallback(() => {
    if (!user?.id || !normalizedRole) return;

    const storedVersion = getDashboardStoredLayoutVersion(user.id, normalizedRole);
    if (storedVersion !== null && storedVersion > SUPPORTED_DASHBOARD_LAYOUT_VERSION) {
      console.warn(
        `[dashboard-layout] Unsupported layout version ${storedVersion}; resetting to defaults for role ${normalizedRole}.`,
      );
      const defaults = buildDefaultLayout();
      setAndPersistLayout(defaults, true);
      return;
    }

    const storedPreset = getDashboardLayoutPresetVersion(user.id, normalizedRole);
    const storedV2 = getDashboardLayoutStateV2(user.id, normalizedRole);
    const hasPresetDrift =
      storedPreset !== DASHBOARD_LAYOUT_PRESET_VERSION ||
      storedV2?.presetVersion !== DASHBOARD_LAYOUT_PRESET_VERSION;

    if (storedV2) {
      const normalizedStored = normalizeDashboardLayoutStateV2({
        state: storedV2,
        definitions: WIDGET_DEFINITIONS,
        role: normalizedRole,
        presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
        rulesByTier: TIER_WIDTH_RULES,
      });
      const next = hasPresetDrift ? applyPresetOrderToLayout(normalizedStored) : normalizedStored;
      const shouldPersist = hasPresetDrift || JSON.stringify(storedV2) !== JSON.stringify(next);
      setAndPersistLayout(next, shouldPersist);
      return;
    }

    const legacyEnabled = getDashboardEnabledWidgetIds(
      user.id,
      normalizedRole,
      availableWidgetIds,
      defaultWidgetIds,
    ) as DashboardWidgetId[];
    const legacySpanMap = getDashboardWidgetSpanMap(
      user.id,
      normalizedRole,
      availableWidgetIds,
      Object.fromEntries(availableWidgetIds.map((widgetId) => [widgetId, 1])),
    ) as Record<DashboardWidgetId, number>;
    const legacyLayoutState = getDashboardWidgetLayoutState(user.id, normalizedRole);
    const legacyWidthById = Object.fromEntries(
      availableWidgetIds.map((widgetId) => {
        const legacyValue = legacySpanMap[widgetId];
        if (legacyValue >= 4) {
          return [widgetId, legacyValue];
        }
        if (legacyValue === 2) {
          return [widgetId, 8];
        }
        if (legacyValue === 3) {
          return [widgetId, 12];
        }
        return [widgetId, 4];
      }),
    ) as Partial<Record<DashboardWidgetId, number>>;

    const migrated = migrateLegacyDashboardLayoutToV2({
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      definitions: WIDGET_DEFINITIONS,
      legacyLayoutItems: legacyLayoutState?.items ?? null,
      legacyEnabledWidgetIds: legacyEnabled,
      legacyWidthById,
      defaultOrderedWidgetIds: defaultWidgetIds,
      rulesByTier: TIER_WIDTH_RULES,
    });
    setAndPersistLayout(migrated, true);
  }, [
    applyPresetOrderToLayout,
    buildDefaultLayout,
    defaultDimensionsById,
    defaultWidgetIds,
    availableWidgetIds,
    normalizedRole,
    setAndPersistLayout,
    user?.id,
  ]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id || !normalizedRole) return;

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY ||
        event.key.includes(`hrms.ui.dashboard.layoutPresetVersion.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.dashboard.widgets.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.dashboard.widgetSpans.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.dashboard.layout.${user.id}.${normalizedRole}`)
      ) {
        syncFromStorage();
      }
    };

    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, syncFromStorage as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, syncFromStorage as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id, normalizedRole, syncFromStorage]);

  const effectiveLayoutState = useMemo(() => {
    if (layoutState) return layoutState;
    return buildDefaultLayout();
  }, [buildDefaultLayout, layoutState]);

  const widgetById = useMemo(
    () => new Map(effectiveLayoutState.widgets.map((widget) => [widget.id, widget])),
    [effectiveLayoutState.widgets],
  );
  const hiddenWidgetIds = useMemo(() => {
    return availableWidgetIds.filter((widgetId) => !widgetById.get(widgetId)?.visible);
  }, [availableWidgetIds, widgetById]);
  const hiddenWidgetCount = hiddenWidgetIds.length;
  const scopeLabel = getScopeLabel(normalizedRole, null);
  const headerChips = useMemo(() => {
    const chips: { id: string; label: string; tone?: 'neutral' | 'info' }[] = [];
    if (canViewTeamWidgets) {
      chips.push({ id: 'chip-team-visibility', label: 'Team visibility enabled' });
    }
    if (canViewCriticalWidgets) {
      chips.push({ id: 'chip-critical-insights', label: 'Critical insights enabled', tone: 'info' });
    }
    if (hiddenWidgetCount > 0) {
      chips.push({
        id: 'chip-hidden-widgets',
        label: `${hiddenWidgetCount} hidden widget${hiddenWidgetCount > 1 ? 's' : ''}`,
      });
    }
    return chips;
  }, [canViewCriticalWidgets, canViewTeamWidgets, hiddenWidgetCount]);

  const commitMutation = useCallback((mutator: (current: DashboardLayoutStateV2) => DashboardLayoutStateV2) => {
    const current = layoutStateRef.current ?? effectiveLayoutState;
    const nextRaw = mutator(current);
    const normalized = normalizeDashboardLayoutStateV2({
      state: nextRaw,
      definitions: WIDGET_DEFINITIONS,
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      rulesByTier: TIER_WIDTH_RULES,
    });
    assertDashboardLayoutInvariants(normalized, WIDGET_DEFINITIONS, TIER_WIDTH_RULES);
    setAndPersistLayout(normalized, true);
  }, [effectiveLayoutState, normalizedRole, setAndPersistLayout]);

  const compactLaneAfterMutation = useCallback(
    (laneWidgets: DashboardLayoutStateV2['widgets'], tier: DashboardTier) => {
      const visible = laneWidgets.filter((widget) => widget.visible);
      const compactedVisible = compactLaneWidgets(visible, tier, TIER_WIDTH_RULES);
      const compactedById = new Map(compactedVisible.map((widget) => [widget.id, widget]));
      return laneWidgets.map((widget) => {
        if (!widget.visible) return { ...widget, x: 0, y: 0 };
        const compacted = compactedById.get(widget.id);
        return compacted ? { ...widget, ...compacted } : widget;
      });
    },
    [],
  );

  const handleHideWidget = useCallback((widgetId: DashboardWidgetId) => {
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const tier = WIDGET_DEFINITIONS[widgetId].defaultTier;
      lanes[tier] = compactLaneAfterMutation(
        lanes[tier].map((widget) =>
          widget.id === widgetId ? { ...widget, visible: false, x: 0, y: 0 } : widget,
        ),
        tier,
      );
      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, normalizedRole]);

  const handleRestoreWidget = useCallback((widgetId: DashboardWidgetId) => {
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const definition = WIDGET_DEFINITIONS[widgetId];
      const tier = definition.defaultTier;
      const lane = [...lanes[tier]];
      const existing = lane.find((widget) => widget.id === widgetId);
      const maxY = lane.reduce((acc, widget) => (widget.visible ? Math.max(acc, widget.y) : acc), -1);
      const width = clampWidgetWidthByTier(existing?.w ?? definition.defaultW, tier, TIER_WIDTH_RULES);

      if (existing) {
        lanes[tier] = compactLaneAfterMutation(
          lane.map((widget) =>
            widget.id === widgetId
              ? { ...widget, visible: true, x: 0, y: maxY + 1, w: width, h: definition.defaultH }
              : widget,
          ),
          tier,
        );
      } else {
        lanes[tier] = compactLaneAfterMutation(
          [
            ...lane,
            {
              id: widgetId,
              x: 0,
              y: maxY + 1,
              w: width,
              h: definition.defaultH,
              visible: true,
            },
          ],
          tier,
        );
      }

      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, normalizedRole]);

  const handleRestoreAllHidden = useCallback(() => {
    if (hiddenWidgetIds.length === 0) return;
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const hiddenByTier = DASHBOARD_TIERS.flatMap((tier) =>
        defaultWidgetIds.filter((widgetId) => hiddenWidgetIds.includes(widgetId) && WIDGET_DEFINITIONS[widgetId].defaultTier === tier),
      );

      for (const widgetId of hiddenByTier) {
        const definition = WIDGET_DEFINITIONS[widgetId];
        const tier = definition.defaultTier;
        const lane = [...lanes[tier]];
        const maxY = lane.reduce((acc, widget) => (widget.visible ? Math.max(acc, widget.y) : acc), -1);
        const existing = lane.find((widget) => widget.id === widgetId);
        const width = clampWidgetWidthByTier(existing?.w ?? definition.defaultW, tier, TIER_WIDTH_RULES);
        if (existing) {
          lanes[tier] = lane.map((widget) =>
            widget.id === widgetId
              ? { ...widget, visible: true, x: 0, y: maxY + 1, w: width, h: definition.defaultH }
              : widget,
          );
        } else {
          lanes[tier] = [
            ...lane,
            {
              id: widgetId,
              x: 0,
              y: maxY + 1,
              w: width,
              h: definition.defaultH,
              visible: true,
            },
          ];
        }
      }

      for (const tier of DASHBOARD_TIERS) {
        lanes[tier] = compactLaneAfterMutation(lanes[tier], tier);
      }

      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, defaultWidgetIds, hiddenWidgetIds, normalizedRole]);

  const handleResetWidgets = () => {
    if (!user?.id) return;
    const defaults = buildDefaultLayout();
    setAndPersistLayout(defaults, true);
  };

  const laneLayouts = useMemo(() => {
    const split = splitLayoutByLane(effectiveLayoutState, WIDGET_DEFINITIONS);
    const result: Record<DashboardTier, LayoutState> = {
      primary: { version: 1, items: [] },
      secondary: { version: 1, items: [] },
      supporting: { version: 1, items: [] },
    };

    for (const tier of DASHBOARD_TIERS) {
      result[tier] = {
        version: 1,
        items: split[tier]
          .filter((widget) => widget.visible)
          .map((widget) => ({
            id: widget.id,
            x: widget.x,
            y: widget.y,
            w: widget.w,
            h: widget.h,
          })),
      };
    }

    return result;
  }, [effectiveLayoutState]);

  const laneItems = useMemo(() => {
    const split = splitLayoutByLane(effectiveLayoutState, WIDGET_DEFINITIONS);
    const result: Record<DashboardTier, Array<{
      id: DashboardWidgetId;
      title: string;
      description: string;
      icon: ComponentType<{ className?: string }>;
      view: ReactNode;
    }>> = {
      primary: [],
      secondary: [],
      supporting: [],
    };

    for (const tier of DASHBOARD_TIERS) {
      result[tier] = split[tier]
        .filter((widget) => widget.visible)
        .map((widget) => ({
          id: widget.id,
          title: WIDGET_META[widget.id].label,
          description: WIDGET_META[widget.id].description,
          icon: WIDGET_ICONS[widget.id] as ComponentType<{ className?: string }>,
          view: <DashboardWidgetRenderer widgetId={widget.id} role={normalizedRole} />,
        }));
    }
    return result;
  }, [effectiveLayoutState, normalizedRole]);

  const resizeRulesById = useMemo(() => {
    return Object.fromEntries(
      availableWidgetIds.map((widgetId) => {
        const tier = WIDGET_DEFINITIONS[widgetId].defaultTier;
        return [widgetId, TIER_WIDTH_RULES[tier] as ResizeRule];
      }),
    ) as Record<DashboardWidgetId, ResizeRule>;
  }, [availableWidgetIds]);

  const handleLaneLayoutChange = useCallback((tier: DashboardTier, nextLaneLayout: LayoutState) => {
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const nextById = new Map(nextLaneLayout.items.map((item) => [item.id, item]));
      lanes[tier] = compactLaneAfterMutation(
        lanes[tier].map((widget) => {
          if (!widget.visible) return widget;
          const next = nextById.get(widget.id);
          if (!next) return widget;
          return {
            ...widget,
            x: next.x,
            y: next.y,
            w: clampWidgetWidthByTier(next.w, tier, TIER_WIDTH_RULES),
            h: widget.h,
          };
        }),
        tier,
      );
      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, normalizedRole]);

  return (
    <AppPageContainer spacing="comfortable">
      <PageHeader
        shellDensity="compact"
        title={`Welcome back, ${profile?.first_name || 'there'}!`}
        description={`${format(new Date(), 'EEEE, MMMM d, yyyy')} • ${formatRoleLabel(normalizedRole)} dashboard • ${scopeLabel}`}
        chips={headerChips}
        actionsSlot={(
          <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search anything..."
                className="h-9 w-full rounded-xl pl-9 sm:w-[210px]"
                aria-label="Dashboard quick search"
              />
            </div>
            <Button variant="outline" className="h-9 rounded-xl" onClick={() => navigate('/leave')}>
              <Plus className="mr-2 h-4 w-4" />
              Quick Action
            </Button>
            <InteractionModeToggle
              modes={['customize']}
              includeView={false}
              ariaLabel="Dashboard interaction mode"
              labels={{ customize: 'Customize' }}
              singleModeLabels={{ activate: 'Customize', deactivate: 'Done Editing' }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              aria-label="Open notifications"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <ModeRibbon
        variant="compact"
        sticky
        hideDescription
        dismissLabel="Exit"
        labelOverride={{ customize: 'Customize' }}
        actions={(
          <>
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
              {hiddenWidgetCount} hidden
            </Badge>
            <Button variant="outline" className="h-8 rounded-lg px-2.5 text-xs" onClick={handleResetWidgets}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Role Defaults
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs"
                  disabled={hiddenWidgetIds.length === 0}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Restore Hidden
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(92vw,22rem)] p-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hidden Widgets
                  </p>
                  {hiddenWidgetIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hidden widgets.</p>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full justify-start rounded-lg text-xs"
                        onClick={handleRestoreAllHidden}
                      >
                        Restore all hidden
                      </Button>
                      <div className="max-h-56 space-y-1 overflow-auto pr-1">
                        {hiddenWidgetIds.map((widgetId) => (
                          <Button
                            key={widgetId}
                            type="button"
                            variant="ghost"
                            className="h-8 w-full justify-start rounded-lg text-xs"
                            onClick={() => handleRestoreWidget(widgetId)}
                          >
                            {WIDGET_META[widgetId].label}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      />

      {availableWidgetIds.length === 0 ? (
        <Card className="card-stat border-border/60 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20">
              <Filter className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No dashboard widgets visible</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have hidden all widgets for this role. Enable customize mode to restore widgets or reset the role defaults.
            </p>
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Button className="rounded-lg" onClick={() => setMode('customize')}>
                Customize Dashboard
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={handleResetWidgets}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {DASHBOARD_TIERS.map((tier) => (
            <DashboardLane
              key={tier}
              tier={tier}
              mode={isLayoutEditing ? 'customize' : 'view'}
              items={laneItems[tier]}
              layoutState={laneLayouts[tier]}
              onLayoutStateChange={(nextLaneState) => handleLaneLayoutChange(tier, nextLaneState)}
              onHideItem={(itemId) => handleHideWidget(itemId as DashboardWidgetId)}
              resizeRulesById={resizeRulesById}
            />
          ))}
        </div>
      )}
    </AppPageContainer>
  );
}
