import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ExternalLink, Loader2, Settings, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useNotificationHistory,
  useDeleteNotifications,
  useUserNotifications,
  type NotificationCategoryFilter,
  type NotificationReadFilter,
  type UserNotification,
} from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppPageContainer, DataTableShell, PageHeader, SectionToolbar, StatusBadge } from '@/components/system';

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
        'rounded-xl border p-4 transition-colors shadow-sm',
        isUnread ? 'bg-primary/5 border-primary/20' : 'bg-background border-border/60',
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={categoryBadgeVariant(notification.category) as 'outline' | 'secondary'}>
              {categoryLabel(notification.category)}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {notification.event_type}
            </Badge>
            {isUnread && <StatusBadge status="unread" />}
          </div>
          <div>
            <p className="font-medium text-sm">{notification.title}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {notification.message}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 lg:justify-end">
          {isUnread && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void onMarkRead(notification)}
              disabled={markingRead}
            >
              <Check className="w-4 h-4 mr-1" />
              Mark Read
            </Button>
          )}
          {!isUnread && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => void onMarkUnread(notification)}
              disabled={markingRead}
            >
              Mark Unread
            </Button>
          )}
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

  const { unreadCount } = useUserNotifications(1);
  const { deleteNotifications, isDeleting } = useDeleteNotifications();
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
      const deletedCount = await deleteNotifications({ olderThanDays: cleanupDays, readOnly: true });
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
    <AppPageContainer>
      <PageHeader
        shellDensity="compact"
        title="Notifications"
        description="Review leave workflow and workflow configuration activity."
        actionsSlot={
          <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center lg:justify-end">
            <div className="col-span-2 lg:col-span-1">
              <Select value={String(cleanupDays)} onValueChange={(value) => setCleanupDays(Number(value))}>
                <SelectTrigger className="h-9 w-full rounded-full lg:w-[180px]">
                  <SelectValue placeholder="Cleanup window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Cleanup Read: 30d+</SelectItem>
                  <SelectItem value="90">Cleanup Read: 90d+</SelectItem>
                  <SelectItem value="180">Cleanup Read: 180d+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="h-9 rounded-full"
              onClick={() => void handleCleanupReadNotifications()}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Cleanup Read
            </Button>
            <Button variant="outline" className="h-9 rounded-full" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Refresh
            </Button>
            <div className="col-span-2 grid grid-cols-[1fr_auto] gap-2 lg:contents">
              <Button
                variant="outline"
                className="h-9 rounded-full"
                onClick={() => void markAllNotificationsRead()}
                disabled={unreadCount === 0 || isMarkingRead}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full justify-self-end"
                onClick={() => navigate('/profile?tab=notifications')}
                title="Notification settings"
                aria-label="Open notification settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }
      />

      <DataTableShell
        title="Notification History"
        description={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All notifications are read'}
        hasData={notifications.length > 0}
        headerActions={
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
                    <SelectTrigger className="rounded-full bg-background">
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
                    <SelectTrigger className="rounded-full bg-background">
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
        pagination={
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">{pageLabel}</span>
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
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No notifications match the selected filters.
          </div>
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
    </AppPageContainer>
  );
}