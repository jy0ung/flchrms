import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ChevronRight, Loader2, RefreshCcw, SlidersHorizontal } from 'lucide-react';
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
import { SummaryRail } from '@/components/workspace/SummaryRail';
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

function categoryFilterLabel(category: NotificationCategoryFilter) {
  if (category === 'all') return 'All Categories';
  return categoryLabel(category);
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

function readFilterLabel(readFilter: NotificationReadFilter) {
  if (readFilter === 'unread') return 'Unread only';
  if (readFilter === 'read') return 'Read only';
  return 'All read states';
}

function primaryActionLabel(notification: UserNotification) {
  if (notification.category === 'leave') return 'Open leave workflow';
  if (notification.category === 'admin') return 'Open governance workspace';
  return null;
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
  const actionLabel = primaryActionLabel(notification);
  const interactive = Boolean(target);
  const handleOpen = () => {
    if (!interactive || markingRead) return;
    void onOpenRelated(notification);
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all shadow-sm',
        isUnread ? 'border-primary/20 bg-primary/5' : 'border-border bg-background',
        interactive && 'cursor-pointer hover:border-primary/30 hover:bg-primary/[0.04] focus-within:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive && actionLabel ? `${actionLabel} for ${notification.title}` : undefined}
      aria-disabled={interactive && markingRead ? true : undefined}
      onClick={interactive ? handleOpen : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      } : undefined}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={categoryBadgeVariant(notification.category) as 'outline' | 'secondary'}>
                {categoryLabel(notification.category)}
              </Badge>
              {isUnread ? <StatusBadge status="unread" /> : null}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at || Date.now()), { addSuffix: true })}
              </span>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-sm text-foreground">{notification.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {notification.body}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{eventTypeLabel(notification)}</span>
              <span aria-hidden="true">•</span>
              <span>{categoryLabel(notification.category)}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              if (isUnread) {
                void onMarkRead(notification);
                return;
              }

              void onMarkUnread(notification);
            }}
            disabled={markingRead}
          >
            {isUnread ? (
              <>
                <Check className="h-4 w-4" />
                Mark read
              </>
            ) : (
              'Mark unread'
            )}
          </Button>
        </div>

        {actionLabel ? (
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            <span>{actionLabel}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        ) : null}
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
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
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
  const activeFilterCount = [category !== 'all', readFilter !== 'all'].filter(Boolean).length;
  const summaryItems = useMemo(() => ([
    {
      id: 'unread-count',
      label: 'Unread',
      value: unreadCount,
      helper: unreadCount > 0 ? 'Notifications that still need attention.' : 'Nothing unread right now.',
      icon: Bell,
      tone: unreadCount > 0 ? 'warning' : 'default',
    },
    {
      id: 'current-view',
      label: 'Current View',
      value: totalCount,
      helper: pageLabel,
      icon: SlidersHorizontal,
      tone: 'info',
    },
    {
      id: 'focus',
      label: 'Focus',
      value: activeFilterCount > 0 ? `${activeFilterCount} active` : unreadCount > 0 ? 'Unread first' : 'All clear',
      helper:
        activeFilterCount > 0
          ? `${categoryFilterLabel(category)} • ${readFilterLabel(readFilter)}`
          : unreadCount > 0
            ? 'Start with unread updates in the inbox below.'
            : 'Maintenance tools stay below the inbox when you need them.',
      icon: Bell,
      tone: activeFilterCount > 0 || unreadCount > 0 ? 'info' : 'default',
    },
  ]), [activeFilterCount, category, pageLabel, readFilter, totalCount, unreadCount]);
  const headerContext = useMemo(() => {
    const chips = [<ContextChip key="page-label" className="rounded-full">{pageLabel}</ContextChip>];

    if (category !== 'all') {
      chips.push(
        <ContextChip key="category-filter" className="rounded-full">
          {categoryLabel(category)}
        </ContextChip>,
      );
    }

    if (readFilter !== 'all') {
      chips.push(
        <ContextChip key="read-filter" className="rounded-full">
          {readFilterLabel(readFilter)}
        </ContextChip>,
      );
    }

    return chips;
  }, [category, pageLabel, readFilter]);

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
      eyebrow="Workspace"
      title="Notifications"
      description="Review updates, open related work, and keep track of workflow activity."
      summarySlot={<SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />}
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
        title="Inbox"
        description={
          unreadCount > 0
            ? 'Unread items first, then the rest of your recent workflow activity.'
            : 'Recent workflow and system updates in one reading flow.'
        }
        hasData={notifications.length > 0}
        headerActions={<div className="flex flex-wrap gap-2">{headerContext}</div>}
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
        open={maintenanceOpen}
        onOpenChange={setMaintenanceOpen}
      />
    </UtilityLayout>
  );
}
