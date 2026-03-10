import { createContext } from 'react';

import type { ExecutiveStats } from '@/hooks/useExecutiveStats';
import type { UserNotification } from '@/hooks/useNotifications';

interface DashboardDataContextValue {
  executiveStats: ExecutiveStats | null;
  executiveStatsLoading: boolean;
  executiveStatsError: boolean;
  refetchExecutiveStats: () => Promise<unknown>;
  notifications: UserNotification[];
  unreadNotificationCount: number;
  notificationsLoading: boolean;
  notificationsRefreshing: boolean;
  refetchNotifications: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export { DashboardDataContext };
export type { DashboardDataContextValue };
