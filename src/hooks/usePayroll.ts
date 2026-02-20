import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  SalaryStructure, 
  DeductionTypeRecord, 
  EmployeeDeduction, 
  PayrollPeriod, 
  Payslip 
} from '@/types/payroll';
import { calculateOverlappingLeaveDays, calculateWorkingDays } from '@/lib/payroll';

interface ProfileStatusRow {
  id: string;
  status: string;
}

interface AttendanceRow {
  employee_id: string;
  status: string;
  date: string;
}

interface LeaveRangeRow {
  employee_id: string;
  start_date: string;
  end_date: string;
}

interface DeductionWithTypeRow {
  employee_id: string;
  amount: number;
  deduction_type?: {
    name: string;
    deduction_type: 'fixed' | 'percentage';
  } | null;
}

// Salary Structures
export function useSalaryStructures() {
  return useQuery({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      // First get salary structures
      const { data: salaries, error: salaryError } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (salaryError) throw salaryError;
      if (!salaries?.length) return [];

      // Get employee details separately using explicit foreign key
      const employeeIds = salaries.map(s => s.employee_id);
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, employee_id, department_id, department:departments!profiles_department_id_fkey(name)')
        .in('id', employeeIds);
      
      if (empError) {
        console.error('Failed to fetch employee profiles:', empError);
        // Return salaries without employee info rather than failing
        return salaries.map(salary => ({ ...salary, employee: null }));
      }

      // Merge the data
      return salaries.map(salary => ({
        ...salary,
        employee: employees?.find(e => e.id === salary.employee_id) || null
      }));
    },
    staleTime: 30000, // Cache for 30 seconds to reduce refetches
  });
}

export function useEmployeeSalaryStructure(employeeId?: string) {
  return useQuery({
    queryKey: ['salary-structure', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as SalaryStructure | null;
    },
    enabled: !!employeeId,
    staleTime: 30000,
  });
}

export function useCreateSalaryStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salary: Omit<SalaryStructure, 'id' | 'created_at' | 'updated_at'>) => {
      // Deactivate existing structures for this employee
      await supabase
        .from('salary_structures')
        .update({ is_active: false })
        .eq('employee_id', salary.employee_id);

      const { data, error } = await supabase
        .from('salary_structures')
        .insert(salary)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
      queryClient.invalidateQueries({ queryKey: ['salary-structure'] });
      toast.success('Salary structure created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create salary structure: ' + error.message);
    },
  });
}

export function useUpdateSalaryStructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalaryStructure> & { id: string }) => {
      const { data, error } = await supabase
        .from('salary_structures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
      queryClient.invalidateQueries({ queryKey: ['salary-structure'] });
      toast.success('Salary structure updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update salary structure: ' + error.message);
    },
  });
}

// Deduction Types
export function useDeductionTypes() {
  return useQuery({
    queryKey: ['deduction-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deduction_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as DeductionTypeRecord[];
    },
  });
}

export function useCreateDeductionType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deduction: Omit<DeductionTypeRecord, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('deduction_types')
        .insert(deduction)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deduction-types'] });
      toast.success('Deduction type created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create deduction type: ' + error.message);
    },
  });
}

// Employee Deductions
export function useEmployeeDeductions(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-deductions', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_deductions')
        .select(`
          *,
          deduction_type:deduction_types(*)
        `)
        .eq('employee_id', employeeId!)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as EmployeeDeduction[];
    },
    enabled: !!employeeId,
  });
}

export function useUpsertEmployeeDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deduction: { 
      employee_id: string; 
      deduction_type_id: string; 
      amount: number;
    }) => {
      const { data, error } = await supabase
        .from('employee_deductions')
        .upsert(deduction, { onConflict: 'employee_id,deduction_type_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-deductions'] });
      toast.success('Deduction updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update deduction: ' + error.message);
    },
  });
}

// Payroll Periods
export function usePayrollPeriods() {
  return useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as PayrollPeriod[];
    },
  });
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (period: Omit<PayrollPeriod, 'id' | 'created_at' | 'updated_at' | 'processed_at'>) => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .insert({ ...period, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast.success('Payroll period created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create payroll period: ' + error.message);
    },
  });
}

export function useUpdatePayrollPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PayrollPeriod> & { id: string }) => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast.success('Payroll period updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update payroll period: ' + error.message);
    },
  });
}

// Payslips
export function usePayslips(periodId?: string) {
  return useQuery({
    queryKey: ['payslips', periodId],
    queryFn: async () => {
      // Build query for payslips with payroll period
      let query = supabase
        .from('payslips')
        .select('*, payroll_period:payroll_periods(*)')
        .order('created_at', { ascending: false });
      
      if (periodId) {
        query = query.eq('payroll_period_id', periodId);
      }
      
      const { data: payslips, error: payslipError } = await query;
      
      if (payslipError) throw payslipError;
      if (!payslips?.length) return [];

      // Get employee details separately
      const employeeIds = [...new Set(payslips.map(p => p.employee_id))];
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, employee_id, department_id, departments(name)')
        .in('id', employeeIds);
      
      if (empError) throw empError;

      // Merge the data
      return payslips.map(payslip => ({
        ...payslip,
        employee: employees?.find(e => e.id === payslip.employee_id) || null
      })) as Payslip[];
    },
  });
}

export function useMyPayslips() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-payslips', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          payroll_period:payroll_periods(*)
        `)
        .eq('employee_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Payslip[];
    },
    enabled: !!user,
  });
}

export function useGeneratePayslips() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string) => {
      // Get the payroll period
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodId)
        .single();
      
      if (periodError) throw periodError;

      // Get all active salary structures
      const { data: salaryStructures, error: salaryError } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('is_active', true);
      
      if (salaryError) throw salaryError;
      if (!salaryStructures?.length) {
        toast.error('No salary structures found. Please configure salaries first.');
        return 0;
      }

      // Get employee statuses separately
      const employeeIds = salaryStructures.map(s => s.employee_id);
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id, status')
        .in('id', employeeIds);
      
      if (empError) throw empError;

      // Merge and filter to only active employees
      const structuresWithEmployee = salaryStructures.map((salaryStructure) => ({
        ...salaryStructure,
        employee: (employees as ProfileStatusRow[] | null)?.find(
          (employee) => employee.id === salaryStructure.employee_id,
        ) || null,
      }));

      const activeStructures = structuresWithEmployee.filter(
        (structure): structure is typeof structure & { employee: ProfileStatusRow } =>
          structure.employee?.status === 'active',
      );

      // Get attendance data for the period
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .gte('date', period.start_date)
        .lte('date', period.end_date);
      
      if (attendanceError) throw attendanceError;

      // Get leave data for the period
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date')
        .eq('status', 'hr_approved')
        .or(`and(start_date.lte.${period.end_date},end_date.gte.${period.start_date})`);
      
      if (leaveError) throw leaveError;

      // Get all employee deductions
      const { data: allDeductions, error: deductionsError } = await supabase
        .from('employee_deductions')
        .select(`
          *,
          deduction_type:deduction_types(*)
        `)
        .eq('is_active', true);
      
      if (deductionsError) throw deductionsError;

      const workingDays = calculateWorkingDays(period.start_date, period.end_date);
      const attendanceRows = (attendanceData ?? []) as AttendanceRow[];
      const leaveRows = (leaveData ?? []) as LeaveRangeRow[];
      const deductionRows = (allDeductions ?? []) as DeductionWithTypeRow[];

      // Generate payslips for each employee
      const payslips = activeStructures.map((structure) => {
        const employeeAttendance = attendanceRows.filter(
          (attendance) => attendance.employee_id === structure.employee_id,
        );
        const employeeLeave = leaveRows.filter(
          (leave) => leave.employee_id === structure.employee_id,
        );
        const employeeDeductions = deductionRows.filter(
          (deduction) => deduction.employee_id === structure.employee_id,
        );

        const daysWorked = employeeAttendance.filter(
          (attendance) => attendance.status === 'present' || attendance.status === 'late',
        ).length;
        const daysLeave = employeeLeave.reduce((sum, leave) => (
          sum + calculateOverlappingLeaveDays(
            period.start_date,
            period.end_date,
            leave.start_date,
            leave.end_date,
          )
        ), 0);
        const daysAbsent = Math.max(0, workingDays - daysWorked - daysLeave);

        // Calculate allowances
        const totalAllowances = 
          Number(structure.housing_allowance || 0) +
          Number(structure.transport_allowance || 0) +
          Number(structure.meal_allowance || 0) +
          Number(structure.other_allowances || 0);

        const allowancesBreakdown: Record<string, number> = {
          housing: Number(structure.housing_allowance || 0),
          transport: Number(structure.transport_allowance || 0),
          meal: Number(structure.meal_allowance || 0),
          other: Number(structure.other_allowances || 0),
        };

        // Calculate gross salary (pro-rated based on days worked)
        const basicSalary = Number(structure.basic_salary);
        const dailyRate = workingDays > 0 ? basicSalary / workingDays : 0;
        const proratedBasic = dailyRate * (daysWorked + daysLeave);
        const grossSalary = proratedBasic + totalAllowances;

        // Calculate deductions
        let totalDeductions = 0;
        const deductionsBreakdown: Record<string, number> = {};

        employeeDeductions.forEach((deduction) => {
          let amount = 0;
          if (deduction.deduction_type?.deduction_type === 'percentage') {
            amount = (grossSalary * Number(deduction.amount)) / 100;
          } else {
            amount = Number(deduction.amount);
          }
          totalDeductions += amount;
          deductionsBreakdown[deduction.deduction_type?.name || 'Other'] = amount;
        });

        const netSalary = grossSalary - totalDeductions;

        return {
          payroll_period_id: periodId,
          employee_id: structure.employee_id,
          basic_salary: basicSalary,
          total_allowances: totalAllowances,
          total_deductions: totalDeductions,
          gross_salary: grossSalary,
          net_salary: netSalary,
          working_days: workingDays,
          days_worked: daysWorked,
          days_absent: daysAbsent,
          days_leave: daysLeave,
          overtime_hours: 0,
          overtime_amount: 0,
          deductions_breakdown: deductionsBreakdown,
          allowances_breakdown: allowancesBreakdown,
          status: 'pending' as const,
        };
      });

      // Insert payslips
      if (payslips.length > 0) {
        const { error: insertError } = await supabase
          .from('payslips')
          .insert(payslips);
        
        if (insertError) throw insertError;
      }

      // Update period status
      const { error: updateError } = await supabase
        .from('payroll_periods')
        .update({ status: 'processing', processed_at: new Date().toISOString() })
        .eq('id', periodId);

      if (updateError) throw updateError;

      return payslips.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast.success(`Generated ${count} payslips`);
    },
    onError: (error: Error) => {
      toast.error('Failed to generate payslips: ' + error.message);
    },
  });
}

export function useUpdatePayslipStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'paid' | 'cancelled' }) => {
      const updates: {
        status: 'pending' | 'paid' | 'cancelled';
        paid_at?: string | null;
      } = { status };

      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      } else {
        updates.paid_at = null;
      }

      const { data, error } = await supabase
        .from('payslips')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast.success('Payslip status updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update payslip status: ' + error.message);
    },
  });
}
