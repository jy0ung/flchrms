export type DeductionType = 'fixed' | 'percentage';
export type PayrollStatus = 'draft' | 'processing' | 'completed' | 'cancelled';
export type PayslipStatus = 'pending' | 'paid' | 'cancelled';

export interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  other_allowances: number;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeductionTypeRecord {
  id: string;
  name: string;
  description: string | null;
  deduction_type: DeductionType;
  default_value: number;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDeduction {
  id: string;
  employee_id: string;
  deduction_type_id: string;
  amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deduction_type?: DeductionTypeRecord;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payment_date: string | null;
  status: PayrollStatus;
  created_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_salary: number;
  net_salary: number;
  working_days: number;
  days_worked: number;
  days_absent: number;
  days_leave: number;
  overtime_hours: number;
  overtime_amount: number;
  deductions_breakdown: Record<string, number>;
  allowances_breakdown: Record<string, number>;
  status: PayslipStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_id: string | null;
    department?: { name: string } | null;
  };
  payroll_period?: PayrollPeriod;
}
