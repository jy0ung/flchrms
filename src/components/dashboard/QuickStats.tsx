import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { type KeyboardEvent } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import { CardHeaderStandard } from '@/components/system';

interface QuickStatProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
  clickable?: boolean;
}

function handleKeyActivate(event: KeyboardEvent<HTMLElement>, onClick?: () => void) {
  if (!onClick) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick();
  }
}

function QuickStat({ title, value, subtitle, trend, trendLabel, onClick, clickable }: QuickStatProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-border shadow-sm transition-shadow",
        clickable && "cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-primary/20"
      )}
      onClick={onClick}
      onKeyDown={(event) => handleKeyActivate(event, onClick)}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Open ${title}` : undefined}
    >
      <CardHeaderStandard
        title={title}
        description={subtitle}
        className="p-4 pb-2"
        titleClassName="text-sm font-semibold"
        descriptionClassName="truncate text-xs"
      />
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-xl font-bold tracking-tight md:text-2xl">{value}</p>
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
        {clickable && (
          <p className="mt-2 text-xs text-primary font-medium">Tap to view details →</p>
        )}
      </CardContent>
    </Card>
  );
}

export function QuickStats() {
  const { role } = useAuth();
  const { data: stats, isLoading } = useExecutiveStats();
  const navigate = useNavigate();

  const isManagerOrAbove = canViewManagerDashboardWidgets(role);

  if (!isManagerOrAbove) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 md:h-32 rounded-lg" />
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
        trend={stats.newHiresThisMonth > 0 ? 'up' : 'neutral'}
        trendLabel={stats.newHiresThisMonth > 0 ? `+${stats.newHiresThisMonth} new` : 'No new hires'}
        clickable
        onClick={() => navigate('/employees')}
      />
      <QuickStat
        title="Attendance Rate"
        value={`${stats.attendanceRate}%`}
        subtitle={`${stats.presentToday} present today`}
        trend={attendanceTrend}
        trendLabel={`${stats.avgAttendanceThisMonth}% monthly avg`}
        clickable
        onClick={() => navigate('/attendance')}
      />
      <QuickStat
        title="Pending Leaves"
        value={stats.pendingLeaveRequests}
        subtitle={`${stats.onLeaveToday} on leave today`}
        clickable
        onClick={() => navigate('/leave')}
      />
      <QuickStat
        title="Pending Reviews"
        value={stats.pendingReviews}
        subtitle={`${stats.completedReviewsThisMonth} completed`}
        clickable
        onClick={() => navigate('/performance')}
      />
    </div>
  );
}
