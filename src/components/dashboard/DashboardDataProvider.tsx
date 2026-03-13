import type { ReactNode } from 'react';

import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useUserNotifications } from '@/hooks/useNotifications';
import { useOptionalShellNotifications } from '@/components/layout/ShellNotificationsProvider';

import {
  DashboardDataContext,
  type DashboardDataContextValue,
} from './dashboard-data-context';

function useDashboardDataValue(): DashboardDataContextValue {
  const executiveStatsQuery = useExecutiveStats();
  const shellNotifications = useOptionalShellNotifications();
  const notificationsQuery = useUserNotifications(8, {
    poll: false,
    includeUnreadCount: !shellNotifications,
  });

  return {
    executiveStats: executiveStatsQuery.data ?? null,
    executiveStatsLoading: executiveStatsQuery.isLoading,
    executiveStatsError: executiveStatsQuery.isError,
    refetchExecutiveStats: executiveStatsQuery.refetch,
    notifications: shellNotifications?.notifications.slice(0, 8) ?? notificationsQuery.notifications,
    unreadNotificationCount: shellNotifications?.unreadCount ?? notificationsQuery.unreadCount,
    notificationsLoading: shellNotifications?.isLoading ?? notificationsQuery.isLoading,
    notificationsRefreshing: shellNotifications?.isRefreshing ?? notificationsQuery.isRefreshing,
    refetchNotifications: shellNotifications?.refetch ?? notificationsQuery.refetch,
  };
}

export function DashboardDataProvider({
  children,
  value,
}: {
  children: ReactNode;
  value?: DashboardDataContextValue;
}) {
  if (value) {
    return (
      <DashboardDataContext.Provider value={value}>
        {children}
      </DashboardDataContext.Provider>
    );
  }

  return <DashboardDataProviderFromHooks>{children}</DashboardDataProviderFromHooks>;
}

function DashboardDataProviderFromHooks({ children }: { children: ReactNode }) {
  const derivedValue = useDashboardDataValue();

  return (
    <DashboardDataContext.Provider value={derivedValue}>
      {children}
    </DashboardDataContext.Provider>
  );
}
