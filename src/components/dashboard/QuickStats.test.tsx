import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DashboardDataProvider } from '@/components/dashboard/DashboardDataProvider';
import type { DashboardDataContextValue } from '@/components/dashboard/dashboard-data-context';
import { QuickStats } from '@/components/dashboard/QuickStats';

const navigate = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'manager' }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

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
  it('uses semantic buttons for clickable stats', () => {
    render(
      <MemoryRouter>
        <DashboardDataProvider value={dashboardDataValue}>
          <QuickStats />
        </DashboardDataProvider>
      </MemoryRouter>,
    );

    const employeeCard = screen.getByRole('button', { name: /Open Workforce in Scope/i });
    fireEvent.click(employeeCard);

    expect(navigate).toHaveBeenCalledWith('/employees');
  });
});
