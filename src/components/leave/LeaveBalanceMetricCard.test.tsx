import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeaveBalanceMetricCard } from '@/components/leave/LeaveBalanceMetricCard';
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

describe('LeaveBalanceMetricCard', () => {
  it('renders leave type name', () => {
    render(<LeaveBalanceMetricCard balance={makeBalance()} />);
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
  });

  it('shows total days allowed', () => {
    render(<LeaveBalanceMetricCard balance={makeBalance()} />);
    expect(screen.getByText('of 14 days')).toBeInTheDocument();
  });

  it('shows pending days when > 0', () => {
    render(<LeaveBalanceMetricCard balance={makeBalance({ days_pending: 3 })} />);
    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  it('hides pending text when pending is 0', () => {
    render(<LeaveBalanceMetricCard balance={makeBalance({ days_pending: 0 })} />);
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });

  it('applies exhausted styling when remaining <= 0', () => {
    const { container } = render(
      <LeaveBalanceMetricCard balance={makeBalance({ days_remaining: 0 })} />,
    );
    // Card should have destructive border class
    const card = container.querySelector('[class*="border-destructive"]');
    expect(card).not.toBeNull();
  });

  it('applies low-balance styling when remaining is 1 or 2', () => {
    const { container } = render(
      <LeaveBalanceMetricCard balance={makeBalance({ days_remaining: 2 })} />,
    );
    const card = container.querySelector('[class*="border-orange"]');
    expect(card).not.toBeNull();
  });

  it('does not apply warning styling when remaining > 2', () => {
    const { container } = render(
      <LeaveBalanceMetricCard balance={makeBalance({ days_remaining: 10 })} />,
    );
    expect(container.querySelector('[class*="border-destructive"]')).toBeNull();
    expect(container.querySelector('[class*="border-orange"]')).toBeNull();
  });

  it('renders SVG progress ring', () => {
    const { container } = render(
      <LeaveBalanceMetricCard balance={makeBalance()} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('shows remaining days as center text in SVG', () => {
    const { container } = render(
      <LeaveBalanceMetricCard balance={makeBalance({ days_remaining: 7 })} />,
    );
    const svgText = container.querySelector('svg text');
    expect(svgText?.textContent).toBe('7');
  });
});
