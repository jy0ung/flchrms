import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Payroll from '@/pages/Payroll';
import type { AppRole } from '@/types/hrms';

// ── Mock variables ───────────────────────────────────────────────
let mockRole: AppRole = 'employee';
let mockPayrollPeriods: Array<{ status: string }> = [];
let mockSalaryStructures: Array<unknown> = [];
let mockDeductionTypes: Array<unknown> = [];
let mockMyPayslips: Array<{ id: string; net_salary: number; created_at: string }> = [];
let mockEmployeeSalary:
  | {
      basic_salary: number;
      housing_allowance?: number;
      transport_allowance?: number;
      meal_allowance?: number;
      other_allowances?: number;
    }
  | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    role: mockRole,
    user: { id: 'u1' },
    profile: { first_name: 'Test' },
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/usePayroll', () => ({
  usePayrollPeriods: () => ({ data: mockPayrollPeriods, isLoading: false }),
  useSalaryStructures: () => ({ data: mockSalaryStructures, isLoading: false }),
  useDeductionTypes: () => ({ data: mockDeductionTypes, isLoading: false }),
  useMyPayslips: () => ({ data: mockMyPayslips, isLoading: false }),
  useEmployeeSalaryStructure: () => ({ data: mockEmployeeSalary, isLoading: false }),
}));

// Mock child components to isolate page logic
vi.mock('@/components/payroll/PayrollManagement', () => ({
  PayrollManagement: () => <div data-testid="payroll-management">PayrollManagement</div>,
}));

vi.mock('@/components/payroll/SalaryManagement', () => ({
  SalaryManagement: () => <div data-testid="salary-management">SalaryManagement</div>,
}));

vi.mock('@/components/payroll/DeductionManagement', () => ({
  DeductionManagement: () => <div data-testid="deduction-management">DeductionManagement</div>,
}));

vi.mock('@/components/payroll/MyPayslips', () => ({
  MyPayslips: ({
    hideAmounts,
    onHideAmountsChange,
    showVisibilityToggle,
  }: {
    hideAmounts: boolean;
    onHideAmountsChange?: (value: boolean) => void;
    showVisibilityToggle?: boolean;
  }) => (
    <div data-testid="my-payslips">
      <div>MyPayslips {hideAmounts ? 'hidden' : 'visible'}</div>
      {showVisibilityToggle ? (
        <button type="button" onClick={() => onHideAmountsChange?.(!hideAmounts)}>
          {hideAmounts ? 'Show salary amounts' : 'Hide salary amounts'}
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('@/components/workspace/SummaryRail', () => ({
  SummaryRail: () => <div data-testid="summary-rail">SummaryRail</div>,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

beforeEach(() => {
  mockRole = 'employee';
  mockPayrollPeriods = [];
  mockSalaryStructures = [];
  mockDeductionTypes = [];
  mockMyPayslips = [];
  mockEmployeeSalary = null;
  window.localStorage.clear();
});

describe('Payroll page', () => {
  describe('employee role (no payroll management)', () => {
    beforeEach(() => {
      mockRole = 'employee';
    });

    it('removes the single-tab toolbar and uses setup messaging when no employee payroll data exists', () => {
      render(<Payroll />, { wrapper });

      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.getByText(/payroll setup in progress/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /hide salary amounts/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId('summary-rail')).not.toBeInTheDocument();
    });

    it('shows employee-facing description', () => {
      render(<Payroll />, { wrapper });
      expect(screen.getByText(/review your payslips and salary information/i)).toBeInTheDocument();
      expect(screen.getByText(/payroll setup in progress/i)).toBeInTheDocument();
    });
  });

  describe('hr role (can manage payroll)', () => {
    beforeEach(() => {
      mockRole = 'hr';
    });

    it('shows all four tabs', () => {
      render(<Payroll />, { wrapper });
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4);
    });

    it('shows management description', () => {
      render(<Payroll />, { wrapper });
      expect(screen.getByText(/manage payroll runs/i)).toBeInTheDocument();
    });

    it('shows an active workspace lead ahead of the management surface', () => {
      render(<Payroll />, { wrapper });

      expect(screen.getByText(/active workspace/i)).toBeInTheDocument();
      expect(
        screen.getByText(/run payroll periods, monitor processing, and open generated payslips/i),
      ).toBeInTheDocument();
    });
  });

  describe('hide/show salary amounts toggle', () => {
    it('shows "Hide salary amounts" toggle on payslips tab', () => {
      mockRole = 'employee';
      mockEmployeeSalary = {
        basic_salary: 4200,
      };
      render(<Payroll />, { wrapper });
      const toggle = screen.getByRole('button', { name: /hide salary amounts/i });
      expect(toggle).toBeInTheDocument();
    });

    it('toggles to "Show salary amounts" on click', () => {
      mockRole = 'employee';
      mockEmployeeSalary = {
        basic_salary: 4200,
      };
      render(<Payroll />, { wrapper });
      const toggle = screen.getByRole('button', { name: /hide salary amounts/i });
      fireEvent.click(toggle);
      expect(screen.getByRole('button', { name: /show salary amounts/i })).toBeInTheDocument();
    });

    it('persists hide preference to localStorage', () => {
      mockRole = 'employee';
      mockMyPayslips = [
        { id: 'pay-1', net_salary: 4200, created_at: '2026-02-01T00:00:00.000Z' },
      ];
      render(<Payroll />, { wrapper });
      const toggle = screen.getByRole('button', { name: /hide salary amounts/i });
      fireEvent.click(toggle);
      expect(window.localStorage.getItem('hrms.payroll.hideAmounts')).toBe('1');
    });

    it('renders payslips ahead of the trailing summary rail for employee records', () => {
      mockRole = 'employee';
      mockMyPayslips = [
        { id: 'pay-1', net_salary: 4200, created_at: '2026-02-01T00:00:00.000Z' },
      ];

      render(<Payroll />, { wrapper });

      const payslips = screen.getByTestId('my-payslips');
      const summaryRail = screen.getByTestId('summary-rail');

      expect(
        payslips.compareDocumentPosition(summaryRail) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });
});
