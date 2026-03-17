import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MyPayslips } from '@/components/payroll/MyPayslips';

let mockPayslips: Array<unknown> = [];
let mockSalary: {
  basic_salary: number;
  housing_allowance?: number;
  transport_allowance?: number;
  meal_allowance?: number;
  other_allowances?: number;
} | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/hooks/usePayroll', () => ({
  useMyPayslips: () => ({ data: mockPayslips, isLoading: false }),
  useEmployeeSalaryStructure: () => ({ data: mockSalary, isLoading: false }),
}));

vi.mock('@/components/payroll/PayslipDetailDialog', () => ({
  PayslipDetailDialog: () => null,
}));

describe('MyPayslips', () => {
  beforeEach(() => {
    mockPayslips = [];
    mockSalary = null;
    window.localStorage.clear();
  });

  it('collapses missing salary and missing payslips into one setup state', () => {
    render(<MyPayslips showVisibilityToggle={false} showSummaryCards={false} />);

    expect(screen.getByText('Payroll setup in progress')).toBeInTheDocument();
    expect(screen.queryByText('Salary structure not configured')).not.toBeInTheDocument();
    expect(screen.queryByText('Payslip History')).not.toBeInTheDocument();
  });

  it('keeps payslip history empty messaging when salary is configured but no payslips exist', () => {
    mockSalary = {
      basic_salary: 4200,
    };

    render(<MyPayslips showVisibilityToggle={false} showSummaryCards={false} />);

    expect(screen.getByText('Payslip History')).toBeInTheDocument();
    expect(screen.getByText('No payslips available yet')).toBeInTheDocument();
    expect(screen.queryByText('Payroll setup in progress')).not.toBeInTheDocument();
  });
});
