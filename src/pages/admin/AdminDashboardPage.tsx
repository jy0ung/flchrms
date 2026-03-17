import { useMemo } from 'react';
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
import { ContextChip, RouteLoadingState, StatusBadge, SurfaceSection } from '@/components/system';
import { useAdminAnalytics } from '@/hooks/admin/useAdminAnalytics';
import { AdminDeptChart } from '@/components/admin/AdminDeptChart';
import { AdminLeaveTrendChart } from '@/components/admin/AdminLeaveTrendChart';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { UtilityLayout } from '@/layouts/UtilityLayout';

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
    const admins = userRoles?.filter((r) => r.role === 'admin').length ?? 0;
    const hrUsers = userRoles?.filter((r) => r.role === 'hr').length ?? 0;

    return { activeEmployees, totalDepts, totalPolicies, roleAssignments, admins, hrUsers };
  }, [employees, departments, leaveTypes, userRoles]);

  const systemAlerts = useMemo(() => {
    const alerts: { id: string; message: string; tone: 'warning' | 'success' | 'error' }[] = [];
    const terminated = employees?.filter((e) => e.status === 'terminated').length ?? 0;
    if (terminated > 0) {
      alerts.push({
        id: 'terminated',
        message: `${terminated} archived employee account(s) require periodic review.`,
        tone: 'warning',
      });
    }
    const onLeave = employees?.filter((e) => e.status === 'on_leave').length ?? 0;
    if (onLeave > 0) {
      alerts.push({
        id: 'on-leave',
        message: `${onLeave} employee(s) currently on leave.`,
        tone: 'success',
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'healthy',
        message: 'No governance alerts detected. All systems operational.',
        tone: 'success',
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
      eyebrow="Governance"
      title="Admin Dashboard"
      description="Review governance health, operational exceptions, and organization analytics from one oversight workspace."
      metaSlot={(
        <>
          <ContextChip tone="info">Focus: operational oversight</ContextChip>
          <ContextChip>Scope: organization-wide</ContextChip>
        </>
      )}
      summarySlot={<SummaryRail items={kpiCards} />}
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
              />
            ) : (
              <div className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-border bg-muted/30 p-4">
                    <StatusBadge status={alert.tone} labelOverride={alert.tone} className="mb-2" />
                    <p className="text-sm text-foreground">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </SurfaceSection>

          <SurfaceSection
            title="Governance Coverage"
            description="Access, policy, and oversight counts that support admin operations."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-xl bg-muted p-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Role assignments
                    </p>
                    <p className="text-xl font-semibold tracking-tight">{stats.roleAssignments}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.admins} admins • {stats.hrUsers} HR partners
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-xl bg-sky-500/10 p-2 text-sky-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Leave policies
                    </p>
                    <p className="text-xl font-semibold tracking-tight">{stats.totalPolicies}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Published leave types available to employees.
                </p>
              </div>
            </div>
          </SurfaceSection>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Monitor
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
    </UtilityLayout>
  );
}
