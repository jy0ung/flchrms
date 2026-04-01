import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeaveBalanceAdjustmentsSection } from '@/components/admin/LeaveBalanceAdjustmentsSection';
import type { LeaveType } from '@/types/hrms';

let mockRole: 'admin' | 'manager' = 'admin';

const mockRefetchBalances = vi.fn();
const mockRefetchAdjustments = vi.fn();
const leaveTypes: LeaveType[] = [
  {
    id: 'leave-1',
    name: 'Annual Leave',
    description: null,
    days_allowed: 14,
    is_paid: true,
    min_days: 1,
    requires_document: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: mockRole }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [
      {
        id: 'employee-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useLeaveBalance', () => ({
  useLeaveBalance: () => ({
    data: [
      {
        leave_type_id: 'leave-1',
        leave_type_name: 'Annual Leave',
        annual_entitlement: 14,
        auto_accrued_days: 14,
        manual_adjustment_days: 1,
        entitled_days: 15,
        days_used: 4,
        days_pending: 1,
        days_remaining: 10,
        is_unlimited: false,
      },
    ],
    isLoading: false,
    refetch: mockRefetchBalances,
  }),
}));

vi.mock('@/hooks/admin/useLeaveBalanceAdjustments', () => ({
  useLeaveBalanceAdjustments: () => ({
    data: [
      {
        id: 'adj-1',
        employee_id: 'employee-1',
        leave_type_id: 'leave-1',
        leave_type_name: 'Annual Leave',
        adjustment_days: 2,
        previous_balance_days: 8,
        new_balance_days: 10,
        previous_is_unlimited: false,
        new_is_unlimited: false,
        effective_date: '2026-04-01',
        reason: 'Manual correction',
        created_by: 'admin-1',
        created_by_name: 'Admin User',
        metadata: {},
        created_at: '2026-04-01T09:30:00Z',
      },
    ],
    isLoading: false,
    refetch: mockRefetchAdjustments,
  }),
  useCreateLeaveBalanceAdjustment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('LeaveBalanceAdjustmentsSection', () => {
  beforeEach(() => {
    mockRole = 'admin';
    mockRefetchBalances.mockClear();
    mockRefetchAdjustments.mockClear();
  });

  it('renders before and after balance audit columns for authorized roles', () => {
    render(
      <LeaveBalanceAdjustmentsSection
        leaveTypes={leaveTypes}
        canManageLeavePolicies
      />,
    );

    expect(screen.getByRole('button', { name: /add adjustment/i })).toBeEnabled();
    expect(screen.getByRole('columnheader', { name: 'Before' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'After' })).toBeInTheDocument();
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('keeps the surface read-only when the role lacks adjustment permission', () => {
    mockRole = 'manager';

    render(
      <LeaveBalanceAdjustmentsSection
        leaveTypes={leaveTypes}
        canManageLeavePolicies
      />,
    );

    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add adjustment/i })).toBeDisabled();
  });
});
