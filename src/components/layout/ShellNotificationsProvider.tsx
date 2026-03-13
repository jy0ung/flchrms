import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useUserNotifications, type UserNotification } from '@/hooks/useNotifications';

interface ShellNotificationsContextValue {
  notifications: UserNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isMarkingRead: boolean;
  isMarkingUnread: boolean;
  refetch: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markNotificationUnread: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const ShellNotificationsContext = createContext<ShellNotificationsContextValue | null>(null);

export function ShellNotificationsProvider({ children }: { children: ReactNode }) {
  const shellNotifications = useUserNotifications(20);

  const value = useMemo<ShellNotificationsContextValue>(() => ({
    notifications: shellNotifications.notifications,
    unreadCount: shellNotifications.unreadCount,
    isLoading: shellNotifications.isLoading,
    isRefreshing: shellNotifications.isRefreshing,
    isMarkingRead: shellNotifications.isMarkingRead,
    isMarkingUnread: shellNotifications.isMarkingUnread,
    refetch: shellNotifications.refetch,
    markNotificationRead: shellNotifications.markNotificationRead,
    markNotificationUnread: shellNotifications.markNotificationUnread,
    markAllNotificationsRead: shellNotifications.markAllNotificationsRead,
  }), [
    shellNotifications.notifications,
    shellNotifications.unreadCount,
    shellNotifications.isLoading,
    shellNotifications.isRefreshing,
    shellNotifications.isMarkingRead,
    shellNotifications.isMarkingUnread,
    shellNotifications.refetch,
    shellNotifications.markNotificationRead,
    shellNotifications.markNotificationUnread,
    shellNotifications.markAllNotificationsRead,
  ]);

  return (
    <ShellNotificationsContext.Provider value={value}>
      {children}
    </ShellNotificationsContext.Provider>
  );
}

export function useShellNotifications() {
  const context = useContext(ShellNotificationsContext);

  if (!context) {
    throw new Error('useShellNotifications must be used within a ShellNotificationsProvider');
  }

  return context;
}

export function useOptionalShellNotifications() {
  return useContext(ShellNotificationsContext);
}
