import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Clock, 
  UserX, 
  TrendingUp,
  Calendar,
  CalendarCheck,
  CalendarOff,
  GraduationCap,
  Award,
  Target,
  ClipboardList,
  CheckCircle2,
  Building2
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-muted/50',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
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

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
    </div>
  );
}

export function ExecutiveSummary() {
  const { role, profile } = useAuth();
  const { data: stats, isLoading } = useExecutiveStats();
  
  const isManager = role === 'manager';
  const isAdminOrHR = role === 'admin' || role === 'hr';

  if (!isManager && !isAdminOrHR) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const scopeLabel = isManager && stats.departmentName 
    ? `${stats.departmentName} Department` 
    : 'Company Overview';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Executive Summary</h2>
            <p className="text-sm text-muted-foreground">{scopeLabel}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Badge>
      </div>

      {/* Headcount Section */}
      <div>
        <SectionHeader title="Headcount" icon={Users} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={Users}
            variant="info"
          />
          <StatCard
            title="Active"
            value={stats.activeEmployees}
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="New Hires"
            value={stats.newHiresThisMonth}
            subtitle="This month"
            icon={UserPlus}
            variant="info"
          />
          {isManager && stats.departmentEmployeeCount !== undefined && (
            <StatCard
              title="Dept. Size"
              value={stats.departmentEmployeeCount}
              icon={Building2}
              variant="default"
            />
          )}
        </div>
      </div>

      {/* Attendance Section */}
      <div>
        <SectionHeader title="Attendance" icon={Clock} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            icon={UserX}
            variant={stats.absentToday > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Today's Rate"
            value={`${stats.attendanceRate}%`}
            icon={TrendingUp}
            variant={stats.attendanceRate >= 80 ? 'success' : stats.attendanceRate >= 60 ? 'warning' : 'danger'}
          />
          <StatCard
            title="Monthly Avg"
            value={`${stats.avgAttendanceThisMonth}%`}
            icon={Clock}
            variant={stats.avgAttendanceThisMonth >= 80 ? 'success' : 'warning'}
          />
        </div>
      </div>

      {/* Leave Section */}
      <div>
        <SectionHeader title="Leave Management" icon={Calendar} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title="Pending Requests"
            value={stats.pendingLeaveRequests}
            icon={ClipboardList}
            variant={stats.pendingLeaveRequests > 5 ? 'warning' : 'default'}
          />
          <StatCard
            title="On Leave Today"
            value={stats.onLeaveToday}
            icon={CalendarOff}
            variant="info"
          />
          <StatCard
            title="Approved"
            value={stats.approvedLeavesThisMonth}
            subtitle="This month"
            icon={CalendarCheck}
            variant="success"
          />
        </div>
      </div>

      {/* Training & Performance Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Training */}
        <div>
          <SectionHeader title="Training" icon={GraduationCap} />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Active"
              value={stats.activeTrainings}
              icon={GraduationCap}
              variant="info"
            />
            <StatCard
              title="Completed"
              value={stats.completedTrainingsThisMonth}
              subtitle="This month"
              icon={Award}
              variant="success"
            />
            <StatCard
              title="Completion Rate"
              value={`${stats.trainingCompletionRate}%`}
              icon={Target}
              variant={stats.trainingCompletionRate >= 70 ? 'success' : 'warning'}
            />
          </div>
        </div>

        {/* Performance */}
        <div>
          <SectionHeader title="Performance Reviews" icon={ClipboardList} />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              icon={ClipboardList}
              variant={stats.pendingReviews > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Completed"
              value={stats.completedReviewsThisMonth}
              subtitle="This month"
              icon={CheckCircle2}
              variant="success"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
