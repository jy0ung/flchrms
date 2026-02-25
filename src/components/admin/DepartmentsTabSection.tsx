import { Building, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Department Management
              </CardTitle>
              <CardDescription>Create, update, and delete company departments</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search departments..."
                  className="pl-10"
                  value={departmentSearch}
                  onChange={(e) => onDepartmentSearchChange(e.target.value)}
                />
              </div>
              {canManageDepartments && (
                <Button onClick={onOpenCreateDepartment}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Department
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
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
                              onClick={() => onEditDepartment(dept)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
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
        </CardContent>
      </Card>
    </div>
  );
}
