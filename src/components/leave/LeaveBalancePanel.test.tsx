import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeaveBalancePanel } from '@/components/leave/LeaveBalancePanel';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    leave_type_id: 'lt-1',
    leave_type_name: 'Annual Leave',
    days_allowed: 14,
    days_used: 4,
    days_pending: 0,
    days_remaining: 10,
    annual_entitlement: 14,
    auto_accrued_days: 14,
    manual_adjustment_days: 0,
    entitled_days: 14,
    is_unlimited: false,
    cycle_start: '2026-01-01',
    cycle_end: '2026-12-31',
    source: 'test',
    ...overrides,
  };
}

describe('LeaveBalancePanel', () => {
  it('renders the shared balance section and optional action', () => {
    render(
      <LeaveBalancePanel
        balances={[makeBalance()]}
        action={<button type="button">Adjust balances</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'My leave balances' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adjust balances' })).toBeInTheDocument();
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
  });

  it('renders the configured empty state when no balances are available', () => {
    render(
      <LeaveBalancePanel
        balances={[]}
        emptyTitle="No tracked balances"
        emptyDescription="Balances will appear here when policy entitlements are configured."
      />,
    );

    expect(screen.getByText('No tracked balances')).toBeInTheDocument();
    expect(
      screen.getByText('Balances will appear here when policy entitlements are configured.'),
    ).toBeInTheDocument();
  });

  it('renders loading placeholders while balance data is resolving', () => {
    render(<LeaveBalancePanel isLoading />);

    expect(screen.getByLabelText('Loading leave balances')).toBeInTheDocument();
  });
});
