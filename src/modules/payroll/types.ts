export type PayrollWorkspaceTab = 'payroll' | 'salaries' | 'deductions' | 'payslips';

export interface PayrollPageProps {
  initialTab?: PayrollWorkspaceTab;
}
