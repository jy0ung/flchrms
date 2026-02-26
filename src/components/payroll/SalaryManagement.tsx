import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSalaryStructures } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { format } from 'date-fns';
import { Plus, DollarSign, Edit } from 'lucide-react';
import { SalaryStructureDialog } from './SalaryStructureDialog';
import { SalaryStructure } from '@/types/payroll';
import { Department, Profile } from '@/types/hrms';
import { DataTableShell, SectionToolbar } from '@/components/system';

type EmployeeWithDepartment = Profile & { department: Department | null };
type SalaryStructureWithEmployee = SalaryStructure & {
  employee: EmployeeWithDepartment | null;
};

interface SalaryManagementProps {
  showCreateButton?: boolean;
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

export function SalaryManagement({
  showCreateButton = true,
  createDialogOpen,
  onCreateDialogOpenChange,
}: SalaryManagementProps = {}) {
  const { data: salaries, isLoading: salariesLoading } = useSalaryStructures();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [internalShowCreateDialog, setInternalShowCreateDialog] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryStructureWithEmployee | null>(null);
  const salaryRows = (salaries || []) as SalaryStructureWithEmployee[];

  const isLoading = salariesLoading || employeesLoading;
  const isCreateDialogOpen = createDialogOpen ?? internalShowCreateDialog;
  const setCreateDialogOpen = onCreateDialogOpenChange ?? setInternalShowCreateDialog;

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
      <DataTableShell
        title="Salary Structures"
        description="Manage employee salaries and allowances"
        hasData={filteredSalaries.length > 0}
        headerActions={
          showCreateButton ? (
            <Button className="h-9 w-full rounded-full lg:w-auto" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Salary Structure
            </Button>
          ) : null
        }
        toolbar={
          <SectionToolbar
            density="compact"
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search employees...',
              ariaLabel: 'Search salary structures',
              inputProps: { className: 'h-9' },
            }}
          />
        }
        alertBanner={
          employeesWithoutSalary && employeesWithoutSalary.length > 0 ? (
            <div className="rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
              <p className="text-sm text-warning">
                <strong>{employeesWithoutSalary.length}</strong> active employees without salary structure configured
              </p>
            </div>
          ) : null
        }
        emptyState={
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No salary structures found</p>
          </div>
        }
        content={
          filteredSalaries.length > 0 ? (
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
          ) : undefined
        }
      />

      <SalaryStructureDialog
        open={isCreateDialogOpen || !!editingSalary}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingSalary(null);
          }
        }}
        salary={editingSalary}
        employees={employeesWithoutSalary}
      />
    </div>
  );
}
