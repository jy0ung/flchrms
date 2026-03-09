import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Payroll from '@/pages/Payroll';
import type { AppRole } from '@/types/hrms';

// ── Mock variables ───────────────────────────────────────────────
let mockRole: AppRole = 'employee';

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
  usePayrollPeriods: () => ({ data: [], isLoading: false }),
  useSalaryStructures: () => ({ data: [], isLoading: false }),
  useDeductionTypes: () => ({ data: [], isLoading: false }),
  useMyPayslips: () => ({ data: [], isLoading: false }),
  useEmployeeSalaryStructure: () => ({ data: null, isLoading: false }),
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
  MyPayslips: ({ hideAmounts }: { hideAmounts: boolean }) => (
    <div data-testid="my-payslips">MyPayslips {hideAmounts ? 'hidden' : 'visible'}</div>
  ),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

beforeEach(() => {
  mockRole = 'employee';
  window.localStorage.clear();
});

describe('Payroll page', () => {
  describe('employee role (no payroll management)', () => {
    beforeEach(() => {
      mockRole = 'employee';
    });

    it('only shows My Payslips tab', () => {
      render(<Payroll />, { wrapper });
      // Employee should only have 1 tab
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(1);
    });

    it('shows employee-facing description', () => {
      render(<Payroll />, { wrapper });
      expect(screen.getByText(/review your payslips/i)).toBeInTheDocument();
      expect(screen.getByText(/active view: my payslips/i)).toBeInTheDocument();
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
  });

  describe('hide/show salary amounts toggle', () => {
    it('shows "Hide salary amounts" toggle on payslips tab', () => {
      mockRole = 'employee';
      render(<Payroll />, { wrapper });
      const toggle = screen.getByRole('button', { name: /hide salary amounts/i });
      expect(toggle).toBeInTheDocument();
    });

    it('toggles to "Show salary amounts" on click', () => {
      mockRole = 'employee';
      render(<Payroll />, { wrapper });
      const toggle = screen.getByRole('button', { name: /hide salary amounts/i });
      fireEvent.click(toggle);
      expect(screen.getByRole('button', { name: /show salary amounts/i })).toBeInTheDocument();
    });

    it('persists hide preference to localStorage', () => {
      mockRole = 'employee';
      render(<Payroll />, { wrapper });
      const toggle = screen.getByRole('button', { name: /hide salary amounts/i });
      fireEvent.click(toggle);
      expect(window.localStorage.getItem('hrms.payroll.hideAmounts')).toBe('1');
    });
  });
});
