/**
 * Shared dashboard widget primitives — card wrapper, metric chip, types, and hooks.
 */
import { useMemo, type ComponentType, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { canViewManagerDashboardWidgets, isManager } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CardHeaderStandard } from '@/components/system';
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
    <Card className={cn('flex h-full flex-col overflow-hidden border border-border bg-card shadow-sm rounded-lg', className)}>
      <CardHeaderStandard
        title={title}
        description={description}
        actions={action}
        className="p-4 pb-2"
        titleClassName="text-base md:text-lg"
        descriptionClassName="text-xs md:text-sm"
      />
      <CardContent className="flex-1 min-h-0 overflow-hidden pt-0">{children}</CardContent>
    </Card>
  );
}

export function MetricChip({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const toneClass = {
    default: 'border-border bg-muted text-foreground',
    success: 'border-success/20 bg-success/10 text-success',
    warning: 'border-warning/20 bg-warning/10 text-warning',
    danger: 'border-destructive/20 bg-destructive/10 text-destructive',
    info: 'border-primary/20 bg-primary/10 text-primary',
  }[tone];

  return (
    <div className={cn('rounded-lg border px-3 py-2', toneClass)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold leading-none">{value}</p>
    </div>
  );
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
