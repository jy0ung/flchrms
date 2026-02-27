import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp } from 'lucide-react';
import { canViewExecutiveSummary, isManager } from '@/lib/permissions';
import { CardHeaderStandard } from '@/components/system';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

function StatCard({ title, value, subtitle, trend, trendValue, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-muted/50',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className="relative overflow-hidden border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {trend && trendValue && (
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp className={`w-3 h-3 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500 rotate-180' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    </div>
  );
}

export function ExecutiveSummary() {
  const { role } = useAuth();
  const { data: stats, isLoading } = useExecutiveStats();
  
  const managerViewer = isManager(role);
  const isExecutiveViewer = canViewExecutiveSummary(role) && !managerViewer;

  if (!managerViewer && !isExecutiveViewer) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const scopeLabel = managerViewer && stats.departmentName 
    ? `${stats.departmentName} Department` 
    : 'Company Overview';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/60 shadow-sm">
        <CardHeaderStandard
          title="Executive Summary"
          description={scopeLabel}
          titleClassName="text-lg"
          descriptionClassName="text-sm"
          actions={(
            <Badge variant="outline" className="text-xs">
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Badge>
          )}
        />
      </Card>

      {/* Headcount Section */}
      <div>
        <SectionHeader title="Headcount" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            variant="info"
          />
          <StatCard
            title="Active"
            value={stats.activeEmployees}
            variant="success"
          />
          <StatCard
            title="New Hires"
            value={stats.newHiresThisMonth}
            subtitle="This month"
            variant="info"
          />
          {managerViewer && stats.departmentEmployeeCount !== undefined && (
            <StatCard
              title="Dept. Size"
              value={stats.departmentEmployeeCount}
              variant="default"
            />
          )}
        </div>
      </div>

      {/* Attendance Section */}
      <div>
        <SectionHeader title="Attendance" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            variant="success"
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            variant={stats.absentToday > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Today's Rate"
            value={`${stats.attendanceRate}%`}
            variant={stats.attendanceRate >= 80 ? 'success' : stats.attendanceRate >= 60 ? 'warning' : 'danger'}
          />
          <StatCard
            title="Monthly Avg"
            value={`${stats.avgAttendanceThisMonth}%`}
            variant={stats.avgAttendanceThisMonth >= 80 ? 'success' : 'warning'}
          />
        </div>
      </div>

      {/* Leave Section */}
      <div>
        <SectionHeader title="Leave Management" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title="Pending Requests"
            value={stats.pendingLeaveRequests}
            variant={stats.pendingLeaveRequests > 5 ? 'warning' : 'default'}
          />
          <StatCard
            title="On Leave Today"
            value={stats.onLeaveToday}
            variant="info"
          />
          <StatCard
            title="Approved"
            value={stats.approvedLeavesThisMonth}
            subtitle="This month"
            variant="success"
          />
        </div>
      </div>

      {/* Training & Performance Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Training */}
        <div>
          <SectionHeader title="Training" />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Active"
              value={stats.activeTrainings}
              variant="info"
            />
            <StatCard
              title="Completed"
              value={stats.completedTrainingsThisMonth}
              subtitle="This month"
              variant="success"
            />
            <StatCard
              title="Completion Rate"
              value={`${stats.trainingCompletionRate}%`}
              variant={stats.trainingCompletionRate >= 70 ? 'success' : 'warning'}
            />
          </div>
        </div>

        {/* Performance */}
        <div>
          <SectionHeader title="Performance Reviews" />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              variant={stats.pendingReviews > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Completed"
              value={stats.completedReviewsThisMonth}
              subtitle="This month"
              variant="success"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
