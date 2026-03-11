import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  UserPlus,
  GraduationCap,
  ClipboardList,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { ComponentType } from 'react';
import { useDashboardData } from './useDashboardData';

interface QuickStatProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  onClick?: () => void;
  clickable?: boolean;
  to?: string;
  icon?: ComponentType<{ className?: string }>;
  accentColor?: string;
}

function QuickStat({ title, value, subtitle, trend, trendLabel, onClick, clickable, to, icon: Icon, accentColor }: QuickStatProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const surfaceClassName = cn(
    'group relative overflow-hidden border border-border bg-card shadow-sm transition-all duration-200',
    clickable && 'cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    !clickable && 'rounded-xl',
  );
  const content = (
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>

          {subtitle && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}

          {trend && trendLabel && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <div className={cn(
                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-foreground',
                trend === 'up' && 'border-success/20 bg-success/10',
                trend === 'down' && 'border-destructive/20 bg-destructive/10',
                trend === 'neutral' && 'border-border bg-muted',
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

      {clickable ? (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span>View details</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      ) : null}
    </CardContent>
  );

  if (clickable && to) {
    return (
      <Link
        className={cn(surfaceClassName, 'rounded-xl text-left')}
        to={to}
        aria-label={`Open ${title}`}
      >
        {content}
      </Link>
    );
  }

  if (clickable && onClick) {
    return (
      <button
        type="button"
        className={cn(surfaceClassName, 'rounded-xl text-left')}
        onClick={onClick}
        aria-label={`Open ${title}`}
      >
        {content}
      </button>
    );
  }

  return <div className={surfaceClassName}>{content}</div>;
}

function QuickStatsInner() {
  const { role } = useAuth();
  const { executiveStats: stats, executiveStatsLoading: isLoading } = useDashboardData();

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

  const workforceTotal = role === 'manager'
    ? stats.departmentEmployeeCount ?? stats.activeEmployees
    : stats.totalEmployees;

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <QuickStat
        title="Workforce in Scope"
        value={workforceTotal}
        subtitle={`${stats.activeEmployees} active employees`}
        trend={stats.newHiresThisMonth > 0 ? 'up' : 'neutral'}
        trendLabel={stats.newHiresThisMonth > 0 ? `+${stats.newHiresThisMonth} new this month` : 'No new hires this month'}
        icon={Users}
        accentColor="bg-primary"
        clickable
        to="/employees"
      />
      <QuickStat
        title="New Hires"
        value={stats.newHiresThisMonth}
        subtitle="Employees added this month"
        trend={stats.newHiresThisMonth > 0 ? 'up' : 'neutral'}
        trendLabel={stats.newHiresThisMonth > 0 ? 'Hiring activity this month' : 'No hiring activity this month'}
        icon={UserPlus}
        accentColor={stats.newHiresThisMonth > 0 ? 'bg-info' : 'bg-primary'}
        clickable
        to="/employees"
      />
      <QuickStat
        title="Training Completion"
        value={`${stats.trainingCompletionRate}%`}
        subtitle={`${stats.completedTrainingsThisMonth} completions this month`}
        trend={stats.trainingCompletionRate >= 70 ? 'up' : stats.trainingCompletionRate >= 50 ? 'neutral' : 'down'}
        trendLabel={`${stats.activeTrainings} active programs`}
        icon={GraduationCap}
        accentColor={stats.trainingCompletionRate >= 70 ? 'bg-success' : stats.trainingCompletionRate >= 50 ? 'bg-warning' : 'bg-destructive'}
        clickable
        to="/training"
      />
      <QuickStat
        title="Completed Reviews"
        value={stats.completedReviewsThisMonth}
        subtitle="Performance reviews closed this month"
        trend={stats.completedReviewsThisMonth > 0 ? 'up' : 'neutral'}
        trendLabel={stats.completedReviewsThisMonth > 0 ? `${stats.completedReviewsThisMonth} completed this month` : 'No reviews completed this month'}
        icon={ClipboardList}
        accentColor={stats.completedReviewsThisMonth > 0 ? 'bg-info' : 'bg-primary'}
        clickable
        to="/performance"
      />
    </div>
  );
}

export const QuickStats = memo(QuickStatsInner);
