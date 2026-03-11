import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DashboardDataProvider } from '@/components/dashboard/DashboardDataProvider';
import type { DashboardDataContextValue } from '@/components/dashboard/dashboard-data-context';
import { QuickStats } from './QuickStats';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'manager' }),
}));

const dashboardDataValue: DashboardDataContextValue = {
  executiveStats: {
    totalEmployees: 42,
    activeEmployees: 38,
    departmentEmployeeCount: 12,
    presentToday: 29,
    absentToday: 5,
    onLeaveToday: 4,
    attendanceRate: 86,
    avgAttendanceThisMonth: 83,
    pendingLeaveRequests: 2,
    approvedLeavesThisMonth: 6,
    activeTrainings: 9,
    completedTrainingsThisMonth: 3,
    trainingCompletionRate: 67,
    pendingReviews: 4,
    completedReviewsThisMonth: 2,
    newHiresThisMonth: 1,
  },
  executiveStatsLoading: false,
  executiveStatsError: false,
  refetchExecutiveStats: vi.fn(),
  notifications: [],
  unreadNotificationCount: 0,
  notificationsLoading: false,
  notificationsRefreshing: false,
  refetchNotifications: vi.fn(),
};

describe('QuickStats ownership', () => {
  it('renders strategic organization metrics instead of operational queue signals', () => {
    render(
      <MemoryRouter>
        <DashboardDataProvider value={dashboardDataValue}>
          <QuickStats />
        </DashboardDataProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Workforce in Scope')).toBeInTheDocument();
    expect(screen.getByText('New Hires')).toBeInTheDocument();
    expect(screen.getByText('Training Completion')).toBeInTheDocument();
    expect(screen.getByText('Completed Reviews')).toBeInTheDocument();
    expect(screen.queryByText('Attendance Rate')).not.toBeInTheDocument();
    expect(screen.queryByText('On Leave Today')).not.toBeInTheDocument();
  });
});
