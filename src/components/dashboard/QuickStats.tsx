import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStatProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

function QuickStat({ title, value, subtitle, icon: Icon, trend, trendLabel, variant = 'default' }: QuickStatProps) {
  const variantStyles = {
    default: 'bg-muted/50 text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className={cn('p-2 md:p-3 rounded-xl shrink-0', variantStyles[variant])}>
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>
        {trend && trendLabel && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <TrendIcon 
              className={cn(
                'w-3 h-3',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )} 
            />
            <span className={cn(
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-destructive',
              trend === 'neutral' && 'text-muted-foreground'
            )}>
              {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function QuickStats() {
  const { role } = useAuth();
  const { data: stats, isLoading } = useExecutiveStats();

  const isManagerOrAbove = role === 'manager' || role === 'hr' || role === 'admin';

  if (!isManagerOrAbove) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 md:h-32" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const attendanceTrend = stats.attendanceRate >= 80 ? 'up' : stats.attendanceRate >= 60 ? 'neutral' : 'down';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <QuickStat
        title="Total Employees"
        value={stats.totalEmployees}
        subtitle={`${stats.activeEmployees} active`}
        icon={Users}
        variant="info"
        trend={stats.newHiresThisMonth > 0 ? 'up' : 'neutral'}
        trendLabel={stats.newHiresThisMonth > 0 ? `+${stats.newHiresThisMonth} new` : 'No new hires'}
      />
      <QuickStat
        title="Attendance Rate"
        value={`${stats.attendanceRate}%`}
        subtitle={`${stats.presentToday} present today`}
        icon={UserCheck}
        variant={stats.attendanceRate >= 80 ? 'success' : stats.attendanceRate >= 60 ? 'warning' : 'danger'}
        trend={attendanceTrend}
        trendLabel={`${stats.avgAttendanceThisMonth}% monthly avg`}
      />
      <QuickStat
        title="Pending Leaves"
        value={stats.pendingLeaveRequests}
        subtitle={`${stats.onLeaveToday} on leave today`}
        icon={Calendar}
        variant={stats.pendingLeaveRequests > 5 ? 'warning' : 'default'}
      />
      <QuickStat
        title="Pending Reviews"
        value={stats.pendingReviews}
        subtitle={`${stats.completedReviewsThisMonth} completed`}
        icon={ClipboardList}
        variant={stats.pendingReviews > 0 ? 'warning' : 'success'}
      />
    </div>
  );
}
