import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeaveBalanceSection } from '@/components/leave/LeaveBalanceSection';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    leave_type_id: 'lt-1',
    leave_type_name: 'Annual Leave',
    days_allowed: 14,
    days_used: 4,
    days_pending: 0,
    days_remaining: 10,
    ...overrides,
  };
}

describe('LeaveBalanceSection', () => {
  it('partitions priority balances into primary and keeps secondary collapsed by default', () => {
    const balances: LeaveBalance[] = [
      makeBalance({ leave_type_id: '1', leave_type_name: 'Annual Leave' }),
      makeBalance({ leave_type_id: '2', leave_type_name: 'Sick Leave' }),
      makeBalance({ leave_type_id: '3', leave_type_name: 'Personal Leave' }),
      makeBalance({ leave_type_id: '4', leave_type_name: 'Unpaid Leave', days_allowed: 30, days_remaining: 30 }),
      makeBalance({ leave_type_id: '5', leave_type_name: 'Maternity Leave', days_allowed: 90, days_remaining: 90 }),
      makeBalance({ leave_type_id: '6', leave_type_name: 'Compassionate Leave', days_allowed: 5, days_remaining: 5 }),
    ];

    render(<LeaveBalanceSection balances={balances} />);

    // First 4 are primary (visible), rest are secondary (collapsed)
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('Sick Leave')).toBeInTheDocument();
    expect(screen.getByText('Personal Leave')).toBeInTheDocument();
    expect(screen.getByText('Unpaid Leave')).toBeInTheDocument();
    expect(screen.queryByText('Maternity Leave')).not.toBeInTheDocument();
    expect(screen.queryByText('Compassionate Leave')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Show 2 more leave types' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'leave-balance-secondary-region');
  });

  it('expands secondary balances inline and updates accessibility state', () => {
    const balances: LeaveBalance[] = [
      makeBalance({ leave_type_id: '1', leave_type_name: 'Annual Leave' }),
      makeBalance({ leave_type_id: '2', leave_type_name: 'Sick Leave' }),
      makeBalance({ leave_type_id: '3', leave_type_name: 'Personal Leave' }),
      makeBalance({ leave_type_id: '4', leave_type_name: 'Unpaid Leave' }),
      makeBalance({ leave_type_id: '5', leave_type_name: 'Maternity Leave', days_allowed: 90, days_remaining: 90 }),
    ];

    render(<LeaveBalanceSection balances={balances} />);

    const toggle = screen.getByRole('button', { name: 'Show 1 more leave types' });
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Hide additional leave types' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Maternity Leave')).toBeInTheDocument();
  });

  it('respects maxPrimaryCards and pushes overflow priority types into secondary', () => {
    const balances: LeaveBalance[] = [
      makeBalance({ leave_type_id: '1', leave_type_name: 'Annual Leave' }),
      makeBalance({ leave_type_id: '2', leave_type_name: 'Sick Leave' }),
      makeBalance({ leave_type_id: '3', leave_type_name: 'Personal Leave' }),
      makeBalance({ leave_type_id: '4', leave_type_name: 'Unpaid Leave' }),
    ];

    render(<LeaveBalanceSection balances={balances} maxPrimaryCards={2} />);

    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('Sick Leave')).toBeInTheDocument();
    expect(screen.queryByText('Personal Leave')).not.toBeInTheDocument();
    expect(screen.queryByText('Unpaid Leave')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 2 more leave types' })).toBeInTheDocument();
  });
});
