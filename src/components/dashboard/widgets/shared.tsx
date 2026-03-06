/**
 * Shared dashboard widget primitives — card wrapper, metric chip, types, hooks, and error boundary.
 */
import { Component, useMemo, type ComponentType, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { canViewManagerDashboardWidgets, isManager } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { QueryErrorState } from '@/components/system';
import type { LeaveStatus } from '@/types/hrms';

// ── Types ────────────────────────────────────────────────────────

export interface LeaveRosterItem {
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

export interface PendingLeaveApprovalItem {
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

export interface TrainingProgramOverviewItem {
  title: string;
  completionRate: number;
}

// ── Shared components ────────────────────────────────────────────

export function DashboardWidgetCard({
  title,
  description,
  icon: Icon,
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
    <Card className={cn(
      'group/widget flex h-full flex-col overflow-hidden border border-border bg-card shadow-sm rounded-xl transition-shadow hover:shadow-md',
      className,
    )}>
      <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-5">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        {action && (
          <div className="ml-auto flex shrink-0 items-center gap-2 pt-0.5">
            {action}
          </div>
        )}
      </div>
      <CardContent className="flex-1 min-h-0 overflow-hidden px-5 pb-5 pt-3">{children}</CardContent>
    </Card>
  );
}

export function MetricChip({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const toneClass = {
    default: 'border-border bg-muted/60 text-foreground',
    success: 'border-success/15 bg-success/8 text-success',
    warning: 'border-warning/15 bg-warning/8 text-warning',
    danger: 'border-destructive/15 bg-destructive/8 text-destructive',
    info: 'border-primary/15 bg-primary/8 text-primary',
  }[tone];

  return (
    <div className={cn('rounded-lg border px-3 py-2.5', toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

// ── Error Boundary ───────────────────────────────────────────────

interface WidgetErrorBoundaryProps {
  widgetLabel?: string;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

export class DashboardWidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[DashboardWidget:${this.props.widgetLabel ?? 'unknown'}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="flex h-full flex-col overflow-hidden border border-border bg-card shadow-sm rounded-xl">
          <CardContent className="flex-1 flex items-center justify-center p-6">
            <QueryErrorState
              label={this.props.widgetLabel ?? 'widget'}
              onRetry={() => this.setState({ hasError: false })}
            />
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// ── Shared hooks ─────────────────────────────────────────────────

export function useDashboardOnLeaveTodayRoster() {
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
        departmentEmployeeIds = (employees ?? []).map((row: { id: string }) => row.id);
        if (!departmentEmployeeIds || departmentEmployeeIds.length === 0) return [];
      }

      let query = supabase
        .from('leave_requests')
        .select(`
          id, employee_id, start_date, end_date, status,
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
