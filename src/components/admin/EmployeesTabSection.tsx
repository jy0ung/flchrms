import { Building, Edit, KeyRound, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BatchUpdateDialog } from '@/components/admin/BatchUpdateDialog';
import type { AppRole, Department, EmployeeStatus, Profile } from '@/types/hrms';

interface EmployeesTabSectionProps {
  employees?: Profile[];
  filteredEmployees?: Profile[];
  departments?: Department[];
  employeesLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: EmployeeStatus | 'all';
  onStatusFilterChange: (value: EmployeeStatus | 'all') => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  roleColors: Record<AppRole, string>;
  getUserRole: (userId: string) => AppRole;
  canManageEmployeeProfiles: boolean;
  canOpenAccountProfileEditor: boolean;
  canResetEmployeePasswords: boolean;
  isAdminLimitedProfileEditor: boolean;
  canViewSensitiveEmployeeIdentifiers: boolean;
  updateProfilePending: boolean;
  resetPasswordPending: boolean;
  onEditProfile: (employee: Profile) => void;
  onResetPassword: (employee: Profile) => void;
  onArchiveEmployee: (employee: Profile) => void;
  onRestoreEmployee: (employee: Profile) => void;
  batchUpdateDialogOpen: boolean;
  onBatchUpdateDialogOpenChange: (open: boolean) => void;
}

export function EmployeesTabSection({
  employees,
  filteredEmployees,
  departments,
  employeesLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  roleColors,
  getUserRole,
  canManageEmployeeProfiles,
  canOpenAccountProfileEditor,
  canResetEmployeePasswords,
  isAdminLimitedProfileEditor,
  canViewSensitiveEmployeeIdentifiers,
  updateProfilePending,
  resetPasswordPending,
  onEditProfile,
  onResetPassword,
  onArchiveEmployee,
  onRestoreEmployee,
  batchUpdateDialogOpen,
  onBatchUpdateDialogOpenChange,
}: EmployeesTabSectionProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>View, filter, update, and archive employee profiles</CardDescription>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[auto_auto_auto_minmax(16rem,1fr)] xl:items-center">
              {canManageEmployeeProfiles && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto rounded-full"
                  onClick={() => onBatchUpdateDialogOpenChange(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Batch Update
                </Button>
              )}
              <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as EmployeeStatus | 'all')}>
                <SelectTrigger className="w-full sm:min-w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
                <SelectTrigger className="w-full sm:min-w-[180px]">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {employeesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredEmployees?.map((employee) => {
                  const currentRole = getUserRole(employee.id);
                  return (
                    <div key={employee.id} className="rounded-xl border bg-card p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                          <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
                          <p className="truncate text-xs text-muted-foreground font-mono">@{employee.username}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                          <p className="text-muted-foreground">ID Number</p>
                          <p className="font-mono">{canViewSensitiveEmployeeIdentifiers ? employee.employee_id : 'Restricted'}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                          <p className="text-muted-foreground">Department</p>
                          <p>{employee.department?.name || '-'}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                          <p className="text-muted-foreground">Role</p>
                          <Badge className={`${roleColors[currentRole]} mt-1`}>{currentRole}</Badge>
                        </div>
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                            {employee.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {canOpenAccountProfileEditor && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            title={isAdminLimitedProfileEditor ? 'Edit username alias' : 'Edit profile'}
                            onClick={() => onEditProfile(employee)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {isAdminLimitedProfileEditor ? 'Edit Alias' : 'Edit'}
                          </Button>
                        )}
                        {canResetEmployeePasswords && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            title="Reset password"
                            onClick={() => onResetPassword(employee)}
                            disabled={resetPasswordPending}
                          >
                            <KeyRound className="w-4 h-4 mr-1" />
                            Reset Password
                          </Button>
                        )}
                        {canManageEmployeeProfiles && (
                          employee.status === 'terminated' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
                              onClick={() => onRestoreEmployee(employee)}
                              disabled={updateProfilePending}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => onArchiveEmployee(employee)}
                              disabled={updateProfilePending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Archive
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!filteredEmployees || filteredEmployees.length === 0) && (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No employees match the current filters.
                  </div>
                )}
              </div>

              <div className="hidden rounded-xl border md:block">
                <div className="overflow-x-auto">
                  <Table className="min-w-[980px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>{canViewSensitiveEmployeeIdentifiers ? 'Employee ID' : 'ID Number'}</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees?.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {employee.first_name[0]}{employee.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                                <p className="text-xs text-muted-foreground font-mono">@{employee.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {canViewSensitiveEmployeeIdentifiers ? employee.employee_id : 'Restricted'}
                          </TableCell>
                          <TableCell>{employee.department?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={roleColors[getUserRole(employee.id)]}>
                              {getUserRole(employee.id)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canOpenAccountProfileEditor && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-full"
                                  title={isAdminLimitedProfileEditor ? 'Edit username alias' : 'Edit profile'}
                                  onClick={() => onEditProfile(employee)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canResetEmployeePasswords && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-full"
                                  title="Reset password"
                                  onClick={() => onResetPassword(employee)}
                                  disabled={resetPasswordPending}
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                              )}
                              {canManageEmployeeProfiles && (
                                employee.status === 'terminated' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-emerald-600 hover:text-emerald-700"
                                    onClick={() => onRestoreEmployee(employee)}
                                    disabled={updateProfilePending}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-destructive hover:text-destructive"
                                    onClick={() => onArchiveEmployee(employee)}
                                    disabled={updateProfilePending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!filteredEmployees || filteredEmployees.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No employees match the current filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <BatchUpdateDialog
        open={batchUpdateDialogOpen}
        onOpenChange={onBatchUpdateDialogOpenChange}
        employees={employees}
        departments={departments}
      />
    </div>
  );
}
