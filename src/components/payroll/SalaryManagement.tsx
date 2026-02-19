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

export function SalaryManagement() {
  const { data: salaries, isLoading: salariesLoading } = useSalaryStructures();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSalary, setEditingSalary] = useState<any>(null);

  const isLoading = salariesLoading || employeesLoading;

  const filteredSalaries = salaries?.filter((s: any) => {
    const name = `${s.employee?.first_name} ${s.employee?.last_name}`.toLowerCase();
    const empId = s.employee?.employee_id?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || empId.includes(search.toLowerCase());
  });

  // Only show active employees without salary structures in the dropdown
  const employeesWithoutSalary = employees?.filter(
    emp => emp.status === 'active' && !salaries?.some((s: any) => s.employee_id === emp.id)
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Salary Structure
        </Button>
      </div>

      {/* Warning for employees without salary */}
      {employeesWithoutSalary && employeesWithoutSalary.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="py-3">
            <p className="text-sm text-warning">
              <strong>{employeesWithoutSalary.length}</strong> active employees without salary structure configured
            </p>
          </CardContent>
        </Card>
      )}

      {/* Salary Structures List */}
      <Card>
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
            <div className="overflow-x-auto">
              <table className="w-full">
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
                  {filteredSalaries.map((salary: any) => {
                    const totalAllowances = 
                      Number(salary.housing_allowance || 0) +
                      Number(salary.transport_allowance || 0) +
                      Number(salary.meal_allowance || 0) +
                      Number(salary.other_allowances || 0);
                    const total = Number(salary.basic_salary) + totalAllowances;

                    return (
                      <tr key={salary.id} className="border-b last:border-0">
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
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSalary(salary)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
