import { useMemo } from 'react';
import {
  Users,
  Building2,
  FileText,
  Shield,
  UserCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, StatusBadge } from '@/components/system';
import { useAdminAnalytics } from '@/hooks/admin/useAdminAnalytics';
import { AdminDeptChart } from '@/components/admin/AdminDeptChart';
import { AdminLeaveTrendChart } from '@/components/admin/AdminLeaveTrendChart';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

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
      label: 'Active Employees',
      value: stats.activeEmployees,
      icon: Users,
      description: 'Total active employee records',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Present Today',
      value: dashboardStats?.presentToday ?? 0,
      icon: UserCheck,
      description: 'Employees checked in today',
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/50',
    },
    {
      label: 'Pending Leaves',
      value: dashboardStats?.pendingLeaves ?? 0,
      icon: Clock,
      description: 'Leave requests awaiting approval',
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      label: 'Departments',
      value: stats.totalDepts,
      icon: Building2,
      description: 'Active departments',
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/50',
    },
    {
      label: 'Leave Policies',
      value: stats.totalPolicies,
      icon: FileText,
      description: 'Published leave types',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 dark:bg-cyan-950/50',
    },
    {
      label: 'Role Assignments',
      value: stats.roleAssignments,
      icon: Shield,
      description: `${stats.admins} admins · ${stats.hrUsers} HR`,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
    },
  ];

  if (capabilitiesLoading) {
    return null;
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
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Organization overview, analytics, and system health at a glance."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <Card key={card.label} className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-1">
                  {card.label}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Headcount by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminDeptChart data={deptDistribution} />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Leave Requests (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminLeaveTrendChart data={leaveTrend} />
          </CardContent>
        </Card>
      </div>

      {/* Activity & Alerts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Governance Status */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Governance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Active employees</span>
                <span className="font-medium">{stats.activeEmployees}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Departments</span>
                <span className="font-medium">{stats.totalDepts}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Role assignments</span>
                <span className="font-medium">{stats.roleAssignments}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Published leave policies</span>
                <span className="font-medium">{stats.totalPolicies}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {systemAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-border bg-muted/50 px-3 py-2">
                  <StatusBadge status={alert.tone} labelOverride={alert.tone} className="mb-1 text-[11px]" />
                  <p>{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
