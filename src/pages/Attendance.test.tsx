import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Attendance from '@/pages/Attendance';

const clockInMutate = vi.fn();
const clockOutMutate = vi.fn();

vi.mock('@/hooks/useAttendance', () => ({
  useAttendanceHistory: () => ({
    data: [
      {
        id: 'att-1',
        employee_id: 'user-1',
        date: '2026-02-26',
        clock_in: '2026-02-26T09:15:00.000Z',
        clock_out: '2026-02-26T18:00:00.000Z',
        status: 'late',
        created_at: '2026-02-26T00:00:00.000Z',
      },
    ],
    isLoading: false,
  }),
  useTodayAttendance: () => ({
    data: {
      id: 'att-today',
      employee_id: 'user-1',
      date: '2026-02-26',
      clock_in: '2026-02-26T09:00:00.000Z',
      clock_out: null,
      status: 'present',
      created_at: '2026-02-26T00:00:00.000Z',
    },
  }),
  useClockIn: () => ({ mutate: clockInMutate, isPending: false }),
  useClockOut: () => ({ mutate: clockOutMutate, isPending: false }),
}));

describe('Attendance operational status badges', () => {
  it('renders a task-first today panel with semantic status badges for today and history rows', () => {
    render(<Attendance />);

    expect(screen.getByText(/Today’s attendance/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Recent attendance history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clock Out/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Present/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Late/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/recorded session/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1 session/i)).toBeInTheDocument();
  });
});
