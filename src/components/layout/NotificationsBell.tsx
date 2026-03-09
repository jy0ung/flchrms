import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Loader2, Settings2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useNotificationPreferences,
  useUserNotifications,
  type NotificationPreferenceCategory,
  type UserNotification,
} from '@/hooks/useNotifications';

function resolveNotificationTarget(notification: UserNotification) {
  if (notification.category === 'leave') return '/leave';
  if (notification.category === 'admin') return '/admin';
  return null;
}

function NotificationListItem({
  notification,
  onOpen,
  onToggleRead,
  isMutatingRead,
}: {
  notification: UserNotification;
  onOpen: (notification: UserNotification) => Promise<void> | void;
  onToggleRead: (notification: UserNotification) => Promise<void> | void;
  isMutatingRead: boolean;
}) {
  const isUnread = !notification.read_at;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        isUnread ? 'bg-primary/5 border-primary/20' : 'bg-background',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="w-full text-left bg-transparent border-0 p-0 m-0 appearance-none"
      >
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <span
              className={cn(
                'block h-2 w-2 rounded-full',
                isUnread ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
                {notification.title}
              </p>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {notification.body}
            </p>
            {notification.category === 'leave' && (
              <Badge variant="outline" className="text-[10px]">
                Leave Workflow
              </Badge>
            )}
            {notification.category === 'admin' && (
              <Badge variant="outline" className="text-[10px]">
                Workflow Config
              </Badge>
            )}
          </div>
        </div>
      </button>
      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => void onToggleRead(notification)}
          disabled={isMutatingRead}
        >
          {isUnread ? (
            <>
              <Check className="w-3 h-3 mr-1" />
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

export function NotificationsBell({
  triggerClassName,
}: {
  floating?: boolean;
  triggerClassName?: string;
} = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    isMarkingRead,
    isMarkingUnread,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
  } = useUserNotifications(20);
  const {
    preferences,
    isLoading: preferencesLoading,
    isUpdating: preferencesUpdating,
    updateCategoryEnabled,
  } = useNotificationPreferences();

  const hasNotifications = notifications.length > 0;
  const unreadBadgeLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 99 ? '99+' : String(unreadCount);
  }, [unreadCount]);

  const handleOpenNotification = async (notification: UserNotification) => {
    if (!notification.read_at) {
      try {
        await markNotificationRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    const target = resolveNotificationTarget(notification);
    setOpen(false);

    if (target) {
      navigate(target);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleToggleRead = async (notification: UserNotification) => {
    try {
      if (notification.read_at) {
        await markNotificationUnread(notification.id);
      } else {
        await markNotificationRead(notification.id);
      }
    } catch (error) {
      console.error('Failed to toggle notification read state:', error);
    }
  };

  const handleToggleCategoryPreference = async (
    category: NotificationPreferenceCategory,
    enabled: boolean,
  ) => {
    try {
      await updateCategoryEnabled(category, enabled);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      toast.error('Unable to update preferences', {
        description: 'Please try again.',
      });
    }
  };

  const quickPreferenceRows: Array<{
    key: NotificationPreferenceCategory;
    label: string;
    checked: boolean;
  }> = [
    { key: 'leave', label: 'Leave', checked: preferences?.leave_enabled ?? true },
    { key: 'admin', label: 'Workflow', checked: preferences?.admin_enabled ?? true },
    { key: 'system', label: 'System', checked: preferences?.system_enabled ?? true },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-10 w-10',
            triggerClassName,
          )}
          aria-label="Open notifications"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadBadgeLabel && (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground"
            >
              {unreadBadgeLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-[360px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isMarkingRead}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all
          </Button>
        </div>
        <Separator />
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Quick In-App Preferences</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {quickPreferenceRows.map((row) => (
              <div key={row.key} className="rounded-md border px-2 py-1.5">
                <Label
                  htmlFor={`bell_notification_pref_${row.key}`}
                  className="text-[11px] text-muted-foreground"
                >
                  {row.label}
                </Label>
                <div className="mt-1 flex justify-end">
                  <Switch
                    id={`bell_notification_pref_${row.key}`}
                    checked={row.checked}
                    disabled={preferencesLoading || preferencesUpdating}
                    onCheckedChange={(checked) =>
                      void handleToggleCategoryPreference(row.key, checked)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <ScrollArea className="h-[420px]">
          <div className="p-3 space-y-2">
            {isLoading && (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading notifications...
              </div>
            )}

            {!isLoading && !hasNotifications && (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                No notifications yet.
              </div>
            )}

            {!isLoading &&
              notifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpenNotification}
                  onToggleRead={handleToggleRead}
                  isMutatingRead={isMarkingRead || isMarkingUnread}
                />
              ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
