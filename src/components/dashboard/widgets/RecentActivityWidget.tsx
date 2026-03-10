/**
 * RecentActivityWidget — Recent notification feed as activity timeline.
 */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Bell, CalendarClock, Settings, Shield } from 'lucide-react';

import type { UserNotification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskEmptyState } from '@/components/system';
import { cn } from '@/lib/utils';

import { DashboardWidgetCard } from './shared';
import { useDashboardData } from '../useDashboardData';

const CATEGORY_META: Record<string, { icon: typeof Bell; color: string }> = {
  leave: { icon: CalendarClock, color: 'text-warning' },
  admin: { icon: Shield, color: 'text-primary' },
  system: { icon: Settings, color: 'text-info' },
};

function getNotificationMeta(category: string) {
  return CATEGORY_META[category] ?? { icon: Bell, color: 'text-muted-foreground' };
}

function RecentActivityWidgetInner() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadNotificationCount: unreadCount,
    notificationsLoading: isLoading,
  } = useDashboardData();

  return (
    <DashboardWidgetCard
      title="Recent Activity"
      description={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Your latest notifications.'}
      icon={Activity}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/notifications')}>
          View All
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <TaskEmptyState
          title="No recent activity"
          description="You're all caught up."
          icon={Activity}
          compact
        />
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

          {notifications.slice(0, 6).map((notification, index) => (
            <ActivityItem key={notification.id} notification={notification} isLast={index === Math.min(notifications.length, 6) - 1} />
          ))}

          {notifications.length > 6 && (
            <button
              onClick={() => navigate('/notifications')}
              className="relative ml-8 mt-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:underline"
            >
              +{notifications.length - 6} more
            </button>
          )}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function ActivityItem({ notification, isLast }: { notification: UserNotification; isLast: boolean }) {
  const { icon: Icon, color } = getNotificationMeta(notification.category);
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <div className={cn('relative flex gap-3 py-2', !isLast && 'pb-3')}>
      {/* Timeline dot */}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
        <Icon className={cn('h-3.5 w-3.5', color)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={cn('truncate text-sm', isUnread ? 'font-semibold' : 'font-medium text-muted-foreground')}>
            {notification.title}
          </p>
          {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        {notification.body && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{notification.body}</p>
        )}
        <p className="mt-0.5 text-[11px] text-foreground/70">{timeAgo}</p>
      </div>
    </div>
  );
}

export const RecentActivityWidget = memo(RecentActivityWidgetInner);
