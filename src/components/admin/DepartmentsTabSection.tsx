import { Edit, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableShell, SectionToolbar } from '@/components/system';
import type { Department, Profile } from '@/types/hrms';

interface DepartmentsTabSectionProps {
  departments?: Department[];
  filteredDepartments?: Department[];
  employees?: Profile[];
  departmentSearch: string;
  onDepartmentSearchChange: (value: string) => void;
  canManageDepartments: boolean;
  onOpenCreateDepartment: () => void;
  onEditDepartment: (department: Department) => void;
  onDeleteDepartment: (department: Department) => void;
  deleteDepartmentPending: boolean;
}

export function DepartmentsTabSection({
  departments,
  filteredDepartments,
  employees,
  departmentSearch,
  onDepartmentSearchChange,
  canManageDepartments,
  onOpenCreateDepartment,
  onEditDepartment,
  onDeleteDepartment,
  deleteDepartmentPending,
}: DepartmentsTabSectionProps) {
  return (
    <div className="space-y-4">
      <DataTableShell
        density="compact"
        title="Department Management"
        description="Create, update, and delete company departments"
        headerActions={(
          <SectionToolbar
            variant="inline"
            ariaLabel="Department management search"
            search={{
              value: departmentSearch,
              onChange: onDepartmentSearchChange,
              placeholder: 'Search departments...',
              ariaLabel: 'Search departments',
            }}
            density="compact"
            actions={
              canManageDepartments ? (
                <Button className="w-full rounded-full sm:w-auto" onClick={onOpenCreateDepartment}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Department
                </Button>
              ) : null
            }
          />
        )}
        content={
          <>
          <div className="space-y-3 md:hidden">
            {filteredDepartments?.map((dept) => {
              const employeeCount = employees?.filter((e) => e.department_id === dept.id).length || 0;
              return (
                <div key={dept.id} className="rounded-xl border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{dept.name}</p>
                      <p className="text-sm text-muted-foreground">{dept.description || 'No description'}</p>
                    </div>
                    <Badge variant="outline">{employeeCount} employees</Badge>
                  </div>
                  {canManageDepartments && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => onEditDepartment(dept)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteDepartment(dept)}
                        disabled={employeeCount > 0 || deleteDepartmentPending}
                        title={employeeCount > 0 ? 'Remove or reassign employees before deleting this department.' : 'Delete department'}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {(!departments || departments.length === 0) && (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No departments yet. Create your first department.
              </div>
            )}
            {departments && departments.length > 0 && filteredDepartments?.length === 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No departments match the current search.
              </div>
            )}
          </div>

          <div className="hidden rounded-xl border md:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments?.map((dept) => {
                    const employeeCount = employees?.filter((e) => e.department_id === dept.id).length || 0;
                    return (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-muted-foreground">{dept.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employeeCount} employees</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canManageDepartments && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-full"
                                  aria-label={`Edit department ${dept.name}`}
                                  onClick={() => onEditDepartment(dept)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-full text-destructive hover:text-destructive"
                                  aria-label={`Delete department ${dept.name}`}
                                  onClick={() => onDeleteDepartment(dept)}
                                  disabled={employeeCount > 0 || deleteDepartmentPending}
                                  title={employeeCount > 0 ? 'Remove or reassign employees before deleting this department.' : 'Delete department'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!departments || departments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No departments yet. Create your first department.
                      </TableCell>
                    </TableRow>
                  )}
                  {departments && departments.length > 0 && filteredDepartments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No departments match the current search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          </>
        }
      />
    </div>
  );
}
