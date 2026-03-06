import { memo, type KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Clock,
  CalendarClock,
  ClipboardList,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { ComponentType } from 'react';

interface QuickStatProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
  clickable?: boolean;
  icon?: ComponentType<{ className?: string }>;
  accentColor?: string;
}

function handleKeyActivate(event: KeyboardEvent<HTMLElement>, onClick?: () => void) {
  if (!onClick) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick();
  }
}

function QuickStat({ title, value, subtitle, trend, trendLabel, onClick, clickable, icon: Icon, accentColor }: QuickStatProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border bg-card shadow-sm transition-all duration-200',
        clickable && 'cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5',
      )}
      onClick={onClick}
      onKeyDown={(event) => handleKeyActivate(event, onClick)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Open ${title}` : undefined}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>

            {subtitle && (
              <p className="mt-1.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}

            {trend && trendLabel && (
              <div className="mt-2.5 flex items-center gap-1.5">
                <div className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  trend === 'up' && 'bg-success/10 text-success',
                  trend === 'down' && 'bg-destructive/10 text-destructive',
                  trend === 'neutral' && 'bg-muted text-muted-foreground',
                )}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{trendLabel}</span>
                </div>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              accentColor
                ? `${accentColor}/10`
                : 'bg-muted',
            )}>
              <Icon className={cn(
                'h-5 w-5',
                accentColor ? accentColor.replace('bg-', 'text-') : 'text-muted-foreground',
              )} />
            </div>
          )}
        </div>

        {clickable && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            <span>View details</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickStatsInner() {
  const { role } = useAuth();
  const { data: stats, isLoading } = useExecutiveStats();
  const navigate = useNavigate();

  const isManagerOrAbove = canViewManagerDashboardWidgets(role);

  if (!isManagerOrAbove) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const attendanceTrend = stats.attendanceRate >= 80 ? 'up' : stats.attendanceRate >= 60 ? 'neutral' : 'down';

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <QuickStat
        title="Total Employees"
        value={stats.totalEmployees}
        subtitle={`${stats.activeEmployees} active`}
        trend={stats.newHiresThisMonth > 0 ? 'up' : 'neutral'}
        trendLabel={stats.newHiresThisMonth > 0 ? `+${stats.newHiresThisMonth} new` : 'No new hires'}
        icon={Users}
        accentColor="bg-primary"
        clickable
        onClick={() => navigate('/employees')}
      />
      <QuickStat
        title="Attendance Rate"
        value={`${stats.attendanceRate}%`}
        subtitle={`${stats.presentToday} present today`}
        trend={attendanceTrend}
        trendLabel={`${stats.avgAttendanceThisMonth}% monthly avg`}
        icon={Clock}
        accentColor={stats.attendanceRate >= 80 ? 'bg-success' : stats.attendanceRate >= 60 ? 'bg-warning' : 'bg-destructive'}
        clickable
        onClick={() => navigate('/attendance')}
      />
      <QuickStat
        title="Pending Leaves"
        value={stats.pendingLeaveRequests}
        subtitle={`${stats.onLeaveToday} on leave today`}
        icon={CalendarClock}
        accentColor={stats.pendingLeaveRequests > 5 ? 'bg-warning' : 'bg-info'}
        clickable
        onClick={() => navigate('/leave')}
      />
      <QuickStat
        title="Pending Reviews"
        value={stats.pendingReviews}
        subtitle={`${stats.completedReviewsThisMonth} completed`}
        icon={ClipboardList}
        accentColor={stats.pendingReviews > 5 ? 'bg-warning' : 'bg-info'}
        clickable
        onClick={() => navigate('/performance')}
      />
    </div>
  );
}

export const QuickStats = memo(QuickStatsInner);
