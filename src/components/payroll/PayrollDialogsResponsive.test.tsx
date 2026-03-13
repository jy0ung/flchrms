import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreatePayrollPeriodDialog } from '@/components/payroll/CreatePayrollPeriodDialog';

const mockCreatePayrollPeriod = {
  mutateAsync: vi.fn(),
  isPending: false,
};

vi.mock('@/hooks/usePayroll', () => ({
  useCreatePayrollPeriod: () => mockCreatePayrollPeriod,
}));

describe('Payroll dialog responsive scaffolding', () => {
  it('renders the payroll period flow with mobile full-screen dialog chrome', () => {
    render(
      <CreatePayrollPeriodDialog
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('data-layout', 'full-screen');
    expect(screen.getByRole('heading', { name: /Create Payroll Period/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Period/i })).toBeInTheDocument();
  });
});
