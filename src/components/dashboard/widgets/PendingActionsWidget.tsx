/**
 * PendingActionsWidget — Aggregated pending actions for managers and above.
 * Shows pending leave approvals and pending performance reviews.
 */
import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, CalendarClock, ClipboardList } from 'lucide-react';

import { useReviewsToConduct } from '@/hooks/usePerformance';
import { useAuth } from '@/contexts/AuthContext';
import { canViewManagerDashboardWidgets, canConductPerformanceReviews } from '@/lib/permissions';
import type { AppRole } from '@/types/hrms';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/system';
import { cn } from '@/lib/utils';

import { DashboardWidgetCard } from './shared';
import { useDashboardData } from '../useDashboardData';

function PendingActionsWidgetInner({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const { executiveStats: stats, executiveStatsLoading: isStatsLoading } = useDashboardData();
  const { role: authRole } = useAuth();
  const canReview = canConductPerformanceReviews(authRole);
  const { data: reviewsToConduct, isLoading: isReviewsLoading } = useReviewsToConduct();

  const isManagerOrAbove = canViewManagerDashboardWidgets(role);

  const pendingReviews = useMemo(() => {
    if (!reviewsToConduct) return [];
    return reviewsToConduct
      .filter((r) => r.status === 'draft' || r.status === 'submitted')
      .slice(0, 3);
  }, [reviewsToConduct]);

  const totalActions = (stats?.pendingLeaveRequests ?? 0) + pendingReviews.length;
  const isLoading = isStatsLoading || (canReview && isReviewsLoading);

  if (!isManagerOrAbove) return null;

  return (
    <DashboardWidgetCard
      title="Pending Actions"
      description={totalActions > 0 ? `${totalActions} item${totalActions > 1 ? 's' : ''} requiring your attention.` : 'No pending actions.'}
      icon={ListTodo}
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : totalActions === 0 ? (
        <div className="rounded-lg border border-dashed border-success/30 bg-success/5 p-5 text-center text-sm text-muted-foreground">
          All clear — no pending actions require your attention.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Leave Approvals */}
          {(stats?.pendingLeaveRequests ?? 0) > 0 && (
            <ActionSection
              icon={CalendarClock}
              title="Leave Approvals"
              count={stats!.pendingLeaveRequests}
              tone="warning"
              onAction={() => navigate('/leave')}
              actionLabel="Review Leaves"
            />
          )}

          {/* Pending Performance Reviews */}
          {pendingReviews.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-info" />
                <p className="text-sm font-semibold">Reviews to Complete</p>
                <StatusBadge status="info" labelOverride={`${pendingReviews.length}`} size="sm" />
              </div>
              <div className="space-y-2">
                {pendingReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-info/20 bg-info/5 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {review.employee?.first_name} {review.employee?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {review.review_period || 'Review'} · {review.status}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 rounded-full px-3 text-xs"
                      onClick={() => navigate('/performance')}
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function ActionSection({
  icon: Icon,
  title,
  count,
  tone,
  onAction,
  actionLabel,
}: {
  icon: typeof CalendarClock;
  title: string;
  count: number;
  tone: 'warning' | 'info' | 'danger';
  onAction: () => void;
  actionLabel: string;
}) {
  const toneStyles = {
    warning: 'border-warning/20 bg-warning/5',
    info: 'border-info/20 bg-info/5',
    danger: 'border-destructive/20 bg-destructive/5',
  };

  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-lg border p-3', toneStyles[tone])}>
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', tone === 'warning' ? 'text-warning' : tone === 'info' ? 'text-info' : 'text-destructive')} />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{count} pending</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="h-7 shrink-0 rounded-full px-3 text-xs" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

export const PendingActionsWidget = memo(PendingActionsWidgetInner);
