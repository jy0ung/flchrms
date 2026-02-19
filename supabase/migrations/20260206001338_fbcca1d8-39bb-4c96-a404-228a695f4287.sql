-- Create payroll-related enums
CREATE TYPE public.deduction_type AS ENUM ('fixed', 'percentage');
CREATE TYPE public.payroll_status AS ENUM ('draft', 'processing', 'completed', 'cancelled');
CREATE TYPE public.payslip_status AS ENUM ('pending', 'paid', 'cancelled');

-- Salary structures for employees
CREATE TABLE public.salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  housing_allowance DECIMAL(12, 2) DEFAULT 0,
  transport_allowance DECIMAL(12, 2) DEFAULT 0,
  meal_allowance DECIMAL(12, 2) DEFAULT 0,
  other_allowances DECIMAL(12, 2) DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, effective_date)
);

-- Deduction types (EPF, SOCSO, tax, etc.)
CREATE TABLE public.deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  deduction_type deduction_type NOT NULL DEFAULT 'fixed',
  default_value DECIMAL(12, 2) DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee-specific deductions
CREATE TABLE public.employee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deduction_type_id UUID NOT NULL REFERENCES public.deduction_types(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, deduction_type_id)
);

-- Payroll periods
CREATE TABLE public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_date DATE,
  status payroll_status DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual payslips
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_allowances DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  days_worked INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  days_leave INTEGER DEFAULT 0,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_amount DECIMAL(12, 2) DEFAULT 0,
  deductions_breakdown JSONB DEFAULT '{}',
  allowances_breakdown JSONB DEFAULT '{}',
  status payslip_status DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(payroll_period_id, employee_id)
);

-- Enable RLS
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_structures
CREATE POLICY "HR and Admin can manage salary structures"
ON public.salary_structures FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view own salary structure"
ON public.salary_structures FOR SELECT
USING (employee_id = auth.uid());

-- RLS Policies for deduction_types
CREATE POLICY "HR and Admin can manage deduction types"
ON public.deduction_types FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view deduction types"
ON public.deduction_types FOR SELECT
USING (true);

-- RLS Policies for employee_deductions
CREATE POLICY "HR and Admin can manage employee deductions"
ON public.employee_deductions FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view own deductions"
ON public.employee_deductions FOR SELECT
USING (employee_id = auth.uid());

-- RLS Policies for payroll_periods
CREATE POLICY "HR and Admin can manage payroll periods"
ON public.payroll_periods FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view payroll periods"
ON public.payroll_periods FOR SELECT
USING (true);

-- RLS Policies for payslips
CREATE POLICY "HR and Admin can manage payslips"
ON public.payslips FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view own payslips"
ON public.payslips FOR SELECT
USING (employee_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_salary_structures_updated_at
BEFORE UPDATE ON public.salary_structures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deduction_types_updated_at
BEFORE UPDATE ON public.deduction_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_deductions_updated_at
BEFORE UPDATE ON public.employee_deductions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
BEFORE UPDATE ON public.payroll_periods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at
BEFORE UPDATE ON public.payslips
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default deduction types
INSERT INTO public.deduction_types (name, description, deduction_type, default_value, is_mandatory) VALUES
('EPF Employee', 'Employee Provident Fund contribution', 'percentage', 11, true),
('EPF Employer', 'Employer Provident Fund contribution', 'percentage', 12, true),
('SOCSO Employee', 'Social Security contribution', 'percentage', 0.5, true),
('Income Tax', 'Monthly tax deduction', 'percentage', 0, false),
('Health Insurance', 'Company health insurance', 'fixed', 0, false);