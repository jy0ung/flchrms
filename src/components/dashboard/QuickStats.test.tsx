import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { QuickStats } from '@/components/dashboard/QuickStats';

const navigate = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'manager' }),
}));

vi.mock('@/hooks/useExecutiveStats', () => ({
  useExecutiveStats: () => ({
    isLoading: false,
    data: {
      totalEmployees: 12,
      activeEmployees: 10,
      departmentEmployeeCount: 8,
      presentToday: 9,
      absentToday: 1,
      onLeaveToday: 2,
      attendanceRate: 90,
      avgAttendanceThisMonth: 84,
      pendingLeaveRequests: 3,
      pendingReviews: 2,
      completedReviewsThisMonth: 1,
      trainingCompletionRate: 60,
      activeTrainings: 4,
      newHiresThisMonth: 1,
      approvedLeavesThisMonth: 5,
      scope: 'department',
    },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe('QuickStats accessibility interactions', () => {
  it('uses semantic buttons for clickable stats', () => {
    render(
      <MemoryRouter>
        <QuickStats />
      </MemoryRouter>,
    );

    const employeeCard = screen.getByRole('button', { name: /Open Workforce in Scope/i });
    fireEvent.click(employeeCard);

    expect(navigate).toHaveBeenCalledWith('/employees');
  });
});
