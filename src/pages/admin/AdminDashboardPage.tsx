import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  FileText,
  Shield,
  UserCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { ActionTile, ContextChip, RouteLoadingState, StatusBadge, SurfaceSection } from '@/components/system';
import { useAdminAnalytics } from '@/hooks/admin/useAdminAnalytics';
import { AdminDeptChart } from '@/components/admin/AdminDeptChart';
import { AdminLeaveTrendChart } from '@/components/admin/AdminLeaveTrendChart';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { UtilityLayout } from '@/layouts/UtilityLayout';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  usePageTitle('Admin Dashboard');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles } = useUserRoles();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: dashboardStats } = useDashboardStats();
  const { deptDistribution, leaveTrend } = useAdminAnalytics();

  const stats = useMemo(() => {
    const activeEmployees = employees?.filter((e) => e.status === 'active').length ?? 0;
    const totalDepts = departments?.length ?? 0;
    const totalPolicies = leaveTypes?.length ?? 0;
    const roleAssignments = userRoles?.length ?? 0;

    return { activeEmployees, totalDepts, totalPolicies, roleAssignments };
  }, [employees, departments, leaveTypes, userRoles]);

  const systemAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      message: string;
      tone: 'warning' | 'success' | 'error';
      actionLabel?: string;
      to?: string;
    }> = [];
    const terminated = employees?.filter((e) => e.status === 'terminated').length ?? 0;
    if (terminated > 0) {
      alerts.push({
        id: 'terminated',
        message: `${terminated} archived employee account(s) require periodic review.`,
        tone: 'warning',
        actionLabel: 'Open workforce',
        to: '/employees',
      });
    }
    const onLeave = employees?.filter((e) => e.status === 'on_leave').length ?? 0;
    if (onLeave > 0) {
      alerts.push({
        id: 'on-leave',
        message: `${onLeave} employee(s) currently on leave.`,
        tone: 'success',
        actionLabel: 'Review leave',
        to: '/leave',
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'healthy',
        message: 'No governance alerts detected. All systems operational.',
        tone: 'success',
        actionLabel: 'Open governance hub',
        to: '/admin/quick-actions',
      });
    }
    return alerts;
  }, [employees]);

  const kpiCards = [
    {
      id: 'active-employees',
      label: 'Active Employees',
      value: stats.activeEmployees,
      icon: Users,
      helper: 'Current employee records',
      tone: 'info' as const,
    },
    {
      id: 'present-today',
      label: 'Present Today',
      value: dashboardStats?.presentToday ?? 0,
      icon: UserCheck,
      helper: 'Checked in and active',
      tone: 'success' as const,
    },
    {
      id: 'pending-leaves',
      label: 'Pending Leaves',
      value: dashboardStats?.pendingLeaves ?? 0,
      icon: Clock,
      helper: 'Awaiting approval',
      tone: 'warning' as const,
    },
    {
      id: 'departments',
      label: 'Departments',
      value: stats.totalDepts,
      icon: Building2,
      helper: 'Organization structure coverage',
      tone: 'default' as const,
    },
  ] satisfies SummaryRailItem[];

  if (capabilitiesLoading) {
    return (
      <UtilityLayout
        archetype="task-dashboard"
        eyebrow="Governance"
        title="Admin Dashboard"
        description="Review governance health, operational exceptions, and organization analytics from one oversight workspace."
        metaSlot={(
          <>
            <ContextChip tone="info">Focus: operational oversight</ContextChip>
            <ContextChip>Scope: organization-wide</ContextChip>
          </>
        )}
      >
        <RouteLoadingState
          title="Loading governance overview"
          description="Checking capabilities and preparing the latest admin analytics."
        />
      </UtilityLayout>
    );
  }

  if (!capabilities.canViewAdminDashboard) {
    return (
      <AdminAccessDenied
        title="Dashboard view is disabled"
        description="Your account does not have the capability to view the admin dashboard."
      />
    );
  }

  return (
    <UtilityLayout
      archetype="task-dashboard"
      eyebrow="Governance"
      title="Admin Dashboard"
      description="Review governance health, operational exceptions, and organization analytics from one oversight workspace."
      metaSlot={(
        <>
          <ContextChip tone="info">Focus: operational oversight</ContextChip>
          <ContextChip>Scope: organization-wide</ContextChip>
        </>
      )}
      actionsSlot={(
        <Button asChild variant="outline" className="h-9 rounded-full">
          <Link to="/admin/quick-actions">Open Governance Hub</Link>
        </Button>
      )}
      supportingSlot={(
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Reference
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Reference Analytics
            </h2>
            <p className="text-sm text-muted-foreground">
              Workforce and leave trend context that supports planning after the priority checks are clear.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SurfaceSection
              title="Headcount by Department"
              description="Current employee distribution across the organization."
            >
              <AdminDeptChart data={deptDistribution} />
            </SurfaceSection>

            <SurfaceSection
              title="Leave Requests Trend"
              description="Requests submitted over the last six months."
            >
              <AdminLeaveTrendChart data={leaveTrend} />
            </SurfaceSection>
          </div>
        </section>
      )}
      supportingSurface="none"
    >
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Act first
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Governance Priorities
          </h2>
          <p className="text-sm text-muted-foreground">
            Exceptions, policy coverage, and access readiness that should guide your next decision.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SurfaceSection
            title="System Alerts"
            description="Exceptions and signals that need operational awareness."
          >
            {systemAlerts.length === 1 && systemAlerts[0]?.id === 'healthy' ? (
              <WorkspaceStatePanel
                title="No governance alerts"
                description={systemAlerts[0].message}
                icon={AlertTriangle}
                align="start"
                appearance="default"
                action={systemAlerts[0].to ? (
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to={systemAlerts[0].to}>{systemAlerts[0].actionLabel}</Link>
                  </Button>
                ) : null}
              />
            ) : (
              <div className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-border bg-muted/30 p-4">
                    <StatusBadge status={alert.tone} labelOverride={alert.tone} className="mb-2" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-foreground">{alert.message}</p>
                      {alert.to && alert.actionLabel ? (
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <Link to={alert.to}>{alert.actionLabel}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceSection>

          <SurfaceSection
            title="Open Governance Workspaces"
            description="Jump into the highest-value admin surfaces without leaving the oversight flow."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ActionTile
                title="Roles"
                description={`${stats.roleAssignments} active assignments across admin and HR coverage.`}
                icon={Shield}
                to="/admin/roles"
                badgeLabel={`${stats.roleAssignments} assignments`}
                size="compact"
              />
              <ActionTile
                title="Leave Policies"
                description={`${stats.totalPolicies} published leave types ready for workflow and policy review.`}
                icon={FileText}
                to="/admin/leave-policies"
                badgeLabel={`${stats.totalPolicies} policies`}
                size="compact"
              />
              <ActionTile
                title="Employee Directory"
                description={`${stats.activeEmployees} active records and archived staff oversight in one workspace.`}
                icon={Users}
                to="/employees"
                badgeLabel={`${stats.activeEmployees} active`}
                size="compact"
              />
            </div>
          </SurfaceSection>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Scan now
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Operational Snapshot
          </h2>
          <p className="text-sm text-muted-foreground">
            Lightweight counts that frame the current governance picture after the priority work is clear.
          </p>
        </div>
        <SummaryRail items={kpiCards} variant="subtle" compactBreakpoint="lg" />
      </section>
    </UtilityLayout>
  );
}
