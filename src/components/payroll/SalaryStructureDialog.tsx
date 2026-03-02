import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateSalaryStructure, useUpdateSalaryStructure } from '@/hooks/usePayroll';
import { Profile, Department } from '@/types/hrms';
import { SalaryStructure } from '@/types/payroll';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ModalScaffold } from '@/components/system';

type SalaryStructureWithEmployee = SalaryStructure & {
  employee?: (Profile & { department: Department | null }) | null;
};

interface SalaryStructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary?: SalaryStructureWithEmployee | null;
  employees?: (Profile & { department: Department | null })[];
}

export function SalaryStructureDialog({ 
  open, 
  onOpenChange, 
  salary,
  employees 
}: SalaryStructureDialogProps) {
  const createSalary = useCreateSalaryStructure();
  const updateSalary = useUpdateSalaryStructure();
  const isEditing = !!salary;

  const [employeeId, setEmployeeId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [housingAllowance, setHousingAllowance] = useState('');
  const [transportAllowance, setTransportAllowance] = useState('');
  const [mealAllowance, setMealAllowance] = useState('');
  const [otherAllowances, setOtherAllowances] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (salary) {
      setEmployeeId(salary.employee_id);
      setBasicSalary(String(salary.basic_salary || ''));
      setHousingAllowance(String(salary.housing_allowance || ''));
      setTransportAllowance(String(salary.transport_allowance || ''));
      setMealAllowance(String(salary.meal_allowance || ''));
      setOtherAllowances(String(salary.other_allowances || ''));
      setEffectiveDate(salary.effective_date);
    } else {
      resetForm();
    }
  }, [salary]);

  const resetForm = () => {
    setEmployeeId('');
    setBasicSalary('');
    setHousingAllowance('');
    setTransportAllowance('');
    setMealAllowance('');
    setOtherAllowances('');
    setEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const basicSalaryNum = Number(basicSalary) || 0;
    if (basicSalaryNum <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    const data = {
      employee_id: employeeId,
      basic_salary: basicSalaryNum,
      housing_allowance: Number(housingAllowance) || 0,
      transport_allowance: Number(transportAllowance) || 0,
      meal_allowance: Number(mealAllowance) || 0,
      other_allowances: Number(otherAllowances) || 0,
      effective_date: effectiveDate,
      is_active: true,
    };

    if (isEditing) {
      await updateSalary.mutateAsync({ id: salary.id, ...data });
    } else {
      await createSalary.mutateAsync(data);
    }

    onOpenChange(false);
    resetForm();
  };

  const totalMonthly = 
    (Number(basicSalary) || 0) +
    (Number(housingAllowance) || 0) +
    (Number(transportAllowance) || 0) +
    (Number(mealAllowance) || 0) +
    (Number(otherAllowances) || 0);

  return (
    <ModalScaffold
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Salary Structure' : 'Add Salary Structure'}
      description={
        isEditing
          ? `Update salary for ${salary?.employee?.first_name} ${salary?.employee?.last_name}`
          : 'Set up salary structure for an employee'
      }
      maxWidth="2xl"
      contentClassName="max-h-[90vh] overflow-y-auto"
      headerMeta={<DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      body={(
        <form onSubmit={handleSubmit} className="space-y-4" id="salary-structure-form">
          {!isEditing && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="basicSalary">Basic Salary (RM)</Label>
            <Input
              id="basicSalary"
              type="number"
              step="0.01"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="housingAllowance">Housing (RM)</Label>
              <Input
                id="housingAllowance"
                type="number"
                step="0.01"
                value={housingAllowance}
                onChange={(e) => setHousingAllowance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportAllowance">Transport (RM)</Label>
              <Input
                id="transportAllowance"
                type="number"
                step="0.01"
                value={transportAllowance}
                onChange={(e) => setTransportAllowance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mealAllowance">Meal (RM)</Label>
              <Input
                id="mealAllowance"
                type="number"
                step="0.01"
                value={mealAllowance}
                onChange={(e) => setMealAllowance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherAllowances">Other (RM)</Label>
              <Input
                id="otherAllowances"
                type="number"
                step="0.01"
                value={otherAllowances}
                onChange={(e) => setOtherAllowances(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective Date</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>

          {/* Total Preview */}
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">Total Monthly</span>
              <span className="text-xl font-bold text-primary">
                RM {totalMonthly.toLocaleString()}
              </span>
            </div>
          </div>
        </form>
      )}
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="salary-structure-form"
            className="w-full rounded-full sm:w-auto"
            disabled={createSalary.isPending || updateSalary.isPending}
          >
            {createSalary.isPending || updateSalary.isPending ? 'Saving...' : 'Save'}
          </Button>
        </>
      )}
      footerClassName="flex-col-reverse gap-2 sm:flex-row sm:justify-end"
    />
  );
}
