import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DashboardDataProvider } from '@/components/dashboard/DashboardDataProvider';
import type { DashboardDataContextValue } from '@/components/dashboard/dashboard-data-context';
import { QuickStats } from '@/components/dashboard/QuickStats';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'manager' }),
}));

const dashboardDataValue: DashboardDataContextValue = {
  executiveStats: {
    totalEmployees: 12,
    activeEmployees: 10,
    departmentEmployeeCount: 8,
    presentToday: 9,
    absentToday: 1,
    onLeaveToday: 2,
    attendanceRate: 90,
    avgAttendanceThisMonth: 84,
    pendingLeaveRequests: 3,
    approvedLeavesThisMonth: 5,
    activeTrainings: 4,
    completedTrainingsThisMonth: 2,
    trainingCompletionRate: 60,
    pendingReviews: 2,
    completedReviewsThisMonth: 1,
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

describe('QuickStats accessibility interactions', () => {
  it('uses semantic links for navigational stats', () => {
    render(
      <MemoryRouter>
        <DashboardDataProvider value={dashboardDataValue}>
          <QuickStats />
        </DashboardDataProvider>
      </MemoryRouter>,
    );

    const employeeCard = screen.getByRole('link', { name: /Open Workforce in Scope/i });
    expect(employeeCard).toHaveAttribute('href', '/employees');
  });
});
