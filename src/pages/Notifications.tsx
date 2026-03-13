import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCheck, ExternalLink, Loader2, RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useNotificationHistory,
  type NotificationCategoryFilter,
  type NotificationReadFilter,
  type UserNotification,
} from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ContextChip, DataTableShell, SectionToolbar, StatusBadge, TaskEmptyState } from '@/components/system';
import { NotificationMaintenancePanel } from '@/components/notifications/NotificationMaintenancePanel';
import { UtilityLayout } from '@/layouts/UtilityLayout';
import { useOptionalShellNotifications } from '@/components/layout/ShellNotificationsProvider';

function resolveNotificationTarget(notification: UserNotification) {
  if (notification.category === 'leave') return '/leave';
  if (notification.category === 'admin') return '/admin';
  return null;
}

function categoryLabel(category: string) {
  if (category === 'leave') return 'Leave Workflow';
  if (category === 'admin') return 'Workflow Config';
  return 'System';
}

function categoryBadgeVariant(category: string) {
  if (category === 'leave') return 'outline';
  if (category === 'admin') return 'secondary';
  return 'outline';
}

function eventTypeLabel(notification: UserNotification) {
  const eventType =
    notification.metadata &&
    typeof notification.metadata === 'object' &&
    'event_type' in notification.metadata &&
    typeof notification.metadata.event_type === 'string'
      ? notification.metadata.event_type
      : null;

  return eventType ?? notification.category;
}

function categoryOptions(): { value: NotificationCategoryFilter; label: string }[] {
  return [
    { value: 'all', label: 'All Categories' },
    { value: 'leave', label: 'Leave Workflow' },
    { value: 'admin', label: 'Workflow Config' },
    { value: 'system', label: 'System' },
  ];
}

function readFilterOptions(): { value: NotificationReadFilter; label: string }[] {
  return [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
  ];
}

function NotificationRow({
  notification,
  onMarkRead,
  onMarkUnread,
  onOpenRelated,
  markingRead,
}: {
  notification: UserNotification;
  onMarkRead: (notification: UserNotification) => Promise<void>;
  onMarkUnread: (notification: UserNotification) => Promise<void>;
  onOpenRelated: (notification: UserNotification) => Promise<void>;
  markingRead: boolean;
}) {
  const isUnread = !notification.read_at;
  const target = resolveNotificationTarget(notification);

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors shadow-sm',
        isUnread ? 'bg-primary/5 border-primary/20' : 'bg-background border-border',
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={categoryBadgeVariant(notification.category) as 'outline' | 'secondary'}>
              {categoryLabel(notification.category)}
            </Badge>
            {isUnread && <StatusBadge status="unread" />}
          </div>
          <div>
            <p className="font-medium text-sm">{notification.title}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {notification.body}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
              {eventTypeLabel(notification)}
            </span>
            <span aria-hidden="true">•</span>
            <span>{formatDistanceToNow(new Date(notification.created_at || Date.now()), { addSuffix: true })}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 lg:justify-end">
          {target && (
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => void onOpenRelated(notification)}
              disabled={markingRead}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
          )}
          {isUnread ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => void onMarkRead(notification)}
              disabled={markingRead}
            >
              <Check className="w-4 h-4 mr-1" />
              Mark read
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => void onMarkUnread(notification)}
              disabled={markingRead}
            >
              Mark unread
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  usePageTitle('Notifications');
  const navigate = useNavigate();
  const [category, setCategory] = useState<NotificationCategoryFilter>('all');
  const [readFilter, setReadFilter] = useState<NotificationReadFilter>('all');
  const [cleanupDays, setCleanupDays] = useState(90);
  const [page, setPage] = useState(1);

  const shellNotifications = useOptionalShellNotifications();
  const {
    notifications,
    totalCount,
    totalPages,
    isLoading,
    isFetching,
    isMarkingRead,
    isMarkingUnread,
    refetch,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
    deleteReadNotifications,
    isDeletingReadNotifications,
  } = useNotificationHistory({
    page,
    pageSize: 20,
    category,
    readFilter,
  });

  const pageLabel = useMemo(() => {
    if (totalCount === 0) return 'No notifications';
    const pageSize = 20;
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalCount);
    return `Showing ${from}-${to} of ${totalCount}`;
  }, [page, totalCount]);
  const unreadCount = shellNotifications?.unreadCount ?? 0;

  const handleChangeCategory = (value: NotificationCategoryFilter) => {
    setCategory(value);
    setPage(1);
  };

  const handleChangeReadFilter = (value: NotificationReadFilter) => {
    setReadFilter(value);
    setPage(1);
  };

  const handleMarkRead = async (notification: UserNotification) => {
    if (notification.read_at) return;
    await markNotificationRead(notification.id);
  };

  const handleMarkUnread = async (notification: UserNotification) => {
    if (!notification.read_at) return;
    await markNotificationUnread(notification.id);
  };

  const handleOpenRelated = async (notification: UserNotification) => {
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
    }

    const target = resolveNotificationTarget(notification);
    if (target) navigate(target);
  };

  const handleCleanupReadNotifications = async () => {
    try {
      const deletedCount = await deleteReadNotifications({ olderThanDays: cleanupDays, readOnly: true });
      setPage(1);
      toast.success('Cleanup complete', {
        description:
          deletedCount > 0
            ? `Deleted ${deletedCount} read notification(s) older than ${cleanupDays} days.`
            : `No read notifications older than ${cleanupDays} days were found.`,
      });
    } catch (error) {
      console.error('Failed to delete old notifications:', error);
      toast.error('Unable to clean up notifications', {
        description: 'Please try again.',
      });
    }
  };

  return (
    <UtilityLayout
      title="Notifications"
      description="Review updates, open related work, and keep track of workflow activity."
      controlsSlot={
        <SectionToolbar
          variant="inline"
          density="compact"
          ariaLabel="Notification history filters"
          filters={[
            {
              id: 'notification-category',
              label: 'Category',
              control: (
                <Select value={category} onValueChange={(value) => handleChangeCategory(value as NotificationCategoryFilter)}>
                  <SelectTrigger aria-label="Filter notifications by category" className="rounded-full bg-background">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            },
            {
              id: 'notification-read-status',
              label: 'Read Status',
              control: (
                <Select value={readFilter} onValueChange={(value) => handleChangeReadFilter(value as NotificationReadFilter)}>
                  <SelectTrigger aria-label="Filter notifications by read status" className="rounded-full bg-background">
                    <SelectValue placeholder="Select read status" />
                  </SelectTrigger>
                  <SelectContent>
                    {readFilterOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            },
          ]}
        />
      }
      actionsSlot={
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            variant="outline"
            className="h-9 rounded-full"
            onClick={() => void refetch()}
            aria-busy={isFetching}
          >
            {isFetching ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          {unreadCount > 0 ? (
            <Button
              className="h-9 rounded-full"
              onClick={() => void markAllNotificationsRead()}
              disabled={isMarkingRead}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          ) : (
            <ContextChip className="justify-center rounded-full sm:justify-start">
              All notifications read
            </ContextChip>
          )}
        </div>
      }
    >
      <DataTableShell
        title="Notification History"
        description={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All notifications are read'}
        hasData={notifications.length > 0}
        headerActions={<ContextChip className="rounded-full">{pageLabel}</ContextChip>}
        pagination={
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || isFetching}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground min-w-[70px] text-center self-center">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || isFetching}
              >
                Next
              </Button>
            </div>
          </div>
        }
        loading={isLoading}
        loadingSkeleton={
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading notifications...
          </div>
        }
        emptyState={
          <TaskEmptyState
            title="No notifications match this view"
            description="Try another filter or check back later for new workflow activity."
            icon={CheckCheck}
            compact
          />
        }
        content={
          <ScrollArea className="h-[460px] sm:h-[520px]">
            <div className="space-y-3 pr-3">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onMarkUnread={handleMarkUnread}
                  onOpenRelated={handleOpenRelated}
                  markingRead={isMarkingRead || isMarkingUnread}
                />
              ))}
            </div>
          </ScrollArea>
        }
      />

      <NotificationMaintenancePanel
        cleanupDays={cleanupDays}
        onCleanupDaysChange={setCleanupDays}
        onCleanup={() => void handleCleanupReadNotifications()}
        onOpenSettings={() => navigate('/profile?tab=notifications')}
        isDeleting={isDeletingReadNotifications}
      />
    </UtilityLayout>
  );
}
