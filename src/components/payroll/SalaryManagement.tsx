import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSalaryStructures } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { format } from 'date-fns';
import { Plus, Search, DollarSign, Edit } from 'lucide-react';
import { SalaryStructureDialog } from './SalaryStructureDialog';
import { SalaryStructure } from '@/types/payroll';
import { Department, Profile } from '@/types/hrms';

type EmployeeWithDepartment = Profile & { department: Department | null };
type SalaryStructureWithEmployee = SalaryStructure & {
  employee: EmployeeWithDepartment | null;
};

export function SalaryManagement() {
  const { data: salaries, isLoading: salariesLoading } = useSalaryStructures();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryStructureWithEmployee | null>(null);
  const salaryRows = (salaries || []) as SalaryStructureWithEmployee[];

  const isLoading = salariesLoading || employeesLoading;

  const filteredSalaries = salaryRows.filter((salary) => {
    const name = `${salary.employee?.first_name || ''} ${salary.employee?.last_name || ''}`.toLowerCase();
    const empId = salary.employee?.employee_id?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || empId.includes(search.toLowerCase());
  });

  // Only show active employees without salary structures in the dropdown
  const employeesWithoutSalary = employees?.filter(
    (employee) => employee.status === 'active' && !salaryRows.some((salary) => salary.employee_id === employee.id),
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="rounded-full w-full md:w-auto" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Salary Structure
        </Button>
      </div>

      {/* Warning for employees without salary */}
      {employeesWithoutSalary && employeesWithoutSalary.length > 0 && (
        <Card className="card-stat border-warning/40 bg-warning/5 shadow-sm">
          <CardContent className="py-3">
            <p className="text-sm text-warning">
              <strong>{employeesWithoutSalary.length}</strong> active employees without salary structure configured
            </p>
          </CardContent>
        </Card>
      )}

      {/* Salary Structures List */}
      <Card className="card-stat border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Salary Structures
          </CardTitle>
          <CardDescription>Manage employee salaries and allowances</CardDescription>
        </CardHeader>
        <CardContent>
          {!filteredSalaries?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No salary structures found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredSalaries.map((salary) => {
                  const totalAllowances =
                    Number(salary.housing_allowance || 0) +
                    Number(salary.transport_allowance || 0) +
                    Number(salary.meal_allowance || 0) +
                    Number(salary.other_allowances || 0);
                  const total = Number(salary.basic_salary) + totalAllowances;

                  return (
                    <div key={salary.id} className="rounded-xl border border-border/60 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {salary.employee?.first_name} {salary.employee?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{salary.employee?.employee_id}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setEditingSalary(salary)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Basic</p>
                          <p className="font-semibold">RM {Number(salary.basic_salary).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Allowances</p>
                          <p className="font-semibold">RM {totalAllowances.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-semibold">RM {total.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">Effective</p>
                          <p className="font-semibold">{format(new Date(salary.effective_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Employee</th>
                    <th className="pb-3 font-medium text-muted-foreground">Basic</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Allowances</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Total</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Effective</th>
                    <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaries.map((salary) => {
                    const totalAllowances = 
                      Number(salary.housing_allowance || 0) +
                      Number(salary.transport_allowance || 0) +
                      Number(salary.meal_allowance || 0) +
                      Number(salary.other_allowances || 0);
                    const total = Number(salary.basic_salary) + totalAllowances;

                    return (
                      <tr key={salary.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">
                              {salary.employee?.first_name} {salary.employee?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {salary.employee?.employee_id}
                            </p>
                          </div>
                        </td>
                        <td className="py-3">
                          RM {Number(salary.basic_salary).toLocaleString()}
                        </td>
                        <td className="py-3 hidden md:table-cell">
                          RM {totalAllowances.toLocaleString()}
                        </td>
                        <td className="py-3 hidden lg:table-cell font-medium">
                          RM {total.toLocaleString()}
                        </td>
                        <td className="py-3 hidden lg:table-cell text-sm text-muted-foreground">
                          {format(new Date(salary.effective_date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setEditingSalary(salary)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SalaryStructureDialog
        open={showCreateDialog || !!editingSalary}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingSalary(null);
          }
        }}
        salary={editingSalary}
        employees={employeesWithoutSalary}
      />
    </div>
  );
}
