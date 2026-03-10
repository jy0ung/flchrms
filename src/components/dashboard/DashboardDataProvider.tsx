import type { ReactNode } from 'react';

import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useUserNotifications } from '@/hooks/useNotifications';

import {
  DashboardDataContext,
  type DashboardDataContextValue,
} from './dashboard-data-context';

function useDashboardDataValue(): DashboardDataContextValue {
  const executiveStatsQuery = useExecutiveStats();
  const notificationsQuery = useUserNotifications(8);

  return {
    executiveStats: executiveStatsQuery.data ?? null,
    executiveStatsLoading: executiveStatsQuery.isLoading,
    executiveStatsError: executiveStatsQuery.isError,
    refetchExecutiveStats: executiveStatsQuery.refetch,
    notifications: notificationsQuery.notifications,
    unreadNotificationCount: notificationsQuery.unreadCount,
    notificationsLoading: notificationsQuery.isLoading,
    notificationsRefreshing: notificationsQuery.isRefreshing,
    refetchNotifications: notificationsQuery.refetch,
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
