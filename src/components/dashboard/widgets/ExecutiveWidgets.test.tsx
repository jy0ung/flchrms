import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DashboardDataProvider } from '@/components/dashboard/DashboardDataProvider';
import type { DashboardDataContextValue } from '@/components/dashboard/dashboard-data-context';
import { CriticalInsightsWidget } from './ExecutiveWidgets';

const dashboardDataValue: DashboardDataContextValue = {
  executiveStats: {
    totalEmployees: 42,
    activeEmployees: 38,
    departmentEmployeeCount: 12,
    presentToday: 29,
    absentToday: 5,
    onLeaveToday: 4,
    attendanceRate: 69,
    avgAttendanceThisMonth: 83,
    pendingLeaveRequests: 11,
    approvedLeavesThisMonth: 6,
    activeTrainings: 9,
    completedTrainingsThisMonth: 3,
    trainingCompletionRate: 52,
    pendingReviews: 7,
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

describe('CriticalInsightsWidget', () => {
  it('keeps approval queues out of the alerts surface', () => {
    render(
      <MemoryRouter>
        <DashboardDataProvider value={dashboardDataValue}>
          <CriticalInsightsWidget role="director" />
        </DashboardDataProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Attendance rate below threshold')).toBeInTheDocument();
    expect(screen.getByText('Training completion rate is low')).toBeInTheDocument();
    expect(screen.queryByText('Leave approvals pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Performance reviews pending')).not.toBeInTheDocument();
  });
});
