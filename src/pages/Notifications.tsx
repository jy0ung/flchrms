import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ChevronRight, Loader2, MoreHorizontal, RefreshCcw, SlidersHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  if (!eventType) {
    return categoryLabel(notification.category);
  }

  return eventType
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
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

function showReadUndoToast({
  notification,
  onUndo,
}: {
  notification: UserNotification;
  onUndo: () => Promise<void>;
}) {
  toast.success('Notification marked as read', {
    description: notification.title,
    action: {
      label: 'Undo',
      onClick: () => {
        void onUndo();
      },
    },
  });
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

  const content = (
    <div className="min-w-0 space-y-3">
      <div className="space-y-2">
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
        </div>
      </div>

      {actionLabel ? (
        <div className="flex items-center gap-1 text-xs font-medium text-primary">
          <span>{actionLabel}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all shadow-sm',
        isUnread ? 'border-primary/20 bg-primary/5' : 'border-border bg-background',
        interactive && 'hover:border-primary/30 hover:bg-primary/[0.04] focus-within:border-primary/30',
      )}
    >
      <div className="flex items-start gap-3">
        {interactive ? (
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-w-0 flex-1 justify-start rounded-xl px-3 py-2 text-left whitespace-normal hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={actionLabel ? `${actionLabel} for ${notification.title}` : notification.title}
            onClick={handleOpen}
            disabled={markingRead}
          >
            {content}
          </Button>
        ) : null}
        {!interactive ? <div className="min-w-0 flex-1 px-1">{content}</div> : null}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 rounded-full px-2.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
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
    </div>
  );
}

export default function Notifications() {
  usePageTitle('Notifications');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
      label: 'In view',
      value: totalCount,
      helper: pageLabel,
      icon: SlidersHorizontal,
      tone: 'info',
    },
    {
      id: 'focus',
      label: 'Priority',
      value: activeFilterCount > 0 ? `${activeFilterCount} active` : unreadCount > 0 ? 'Unread first' : 'All clear',
      helper:
        activeFilterCount > 0
          ? `${categoryFilterLabel(category)} • ${readFilterLabel(readFilter)}`
          : unreadCount > 0
            ? 'Unread updates lead the inbox below.'
            : 'Cleanup tools stay below the inbox when you need them.',
      icon: Bell,
      tone: activeFilterCount > 0 || unreadCount > 0 ? 'info' : 'default',
    },
  ]), [activeFilterCount, category, pageLabel, readFilter, totalCount, unreadCount]);
  const headerContext = useMemo(() => {
    const chips = isMobile
      ? []
      : [<ContextChip key="page-label" className="rounded-full">{pageLabel}</ContextChip>];

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
  }, [category, isMobile, pageLabel, readFilter]);

  const mobileStatusStrip = useMemo(() => (
    <div className="flex flex-wrap gap-1.5">
      <ContextChip className="rounded-full">
        {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
      </ContextChip>
      <ContextChip className="rounded-full">
        {activeFilterCount > 0
          ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
          : unreadCount > 0
            ? 'Unread first'
            : 'Inbox clear'}
      </ContextChip>
      <ContextChip className="rounded-full">
        {totalCount > 0 ? `${totalCount} shown` : 'No notifications'}
      </ContextChip>
    </div>
  ), [activeFilterCount, totalCount, unreadCount]);

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
    const target = resolveNotificationTarget(notification);
    if (!target) return;

    if (!notification.read_at) {
      try {
        await markNotificationRead(notification.id);
        showReadUndoToast({
          notification,
          onUndo: async () => {
            await markNotificationUnread(notification.id);
          },
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        toast.error('Unable to update notification state', {
          description: 'The notification will stay unread until the update succeeds.',
        });
      }
    }

    navigate(target);
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
      archetype="inbox"
      eyebrow="Workspace"
      title="Notifications"
      description="Review updates, open related work, and keep track of workflow activity."
      summarySlot={
        isMobile
          ? mobileStatusStrip
          : <SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />
      }
      summarySurface="none"
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
      controlsSurface="none"
      actionsSlot={
        isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 rounded-full"
                aria-label="Open inbox actions"
              >
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void refetch();
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isFetching ? 'Refreshing…' : 'Refresh inbox'}
              </DropdownMenuItem>
              {unreadCount > 0 ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void markAllNotificationsRead();
                  }}
                  disabled={isMarkingRead}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all read
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="outline"
              className="h-9 rounded-full"
              onClick={() => void refetch()}
              aria-busy={isFetching}
            >
              {isFetching ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              {isFetching ? 'Refreshing…' : 'Refresh inbox'}
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
        )
      }
      supportingSlot={(
        <NotificationMaintenancePanel
          cleanupDays={cleanupDays}
          onCleanupDaysChange={setCleanupDays}
          onCleanup={() => void handleCleanupReadNotifications()}
          onOpenSettings={() => navigate('/profile?tab=notifications')}
          isDeleting={isDeletingReadNotifications}
          open={maintenanceOpen}
          onOpenChange={setMaintenanceOpen}
        />
      )}
    >
      <DataTableShell
        title="Inbox"
        description={
          unreadCount > 0
            ? 'Unread items first, then the rest of your recent workflow activity.'
            : isMobile
              ? 'Recent updates in one reading flow.'
              : 'Recent workflow and system updates in one reading flow.'
        }
        hasData={notifications.length > 0}
        headerActions={headerContext.length > 0 ? <div className="flex flex-wrap gap-2">{headerContext}</div> : undefined}
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
          <div className="space-y-3">
            {Array.from({ length: isMobile ? 3 : 4 }, (_, index) => (
              <div key={index} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/2 rounded" />
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-5/6 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>
            ))}
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
    </UtilityLayout>
  );
}
