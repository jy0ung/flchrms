import { Edit, KeyRound, RotateCcw, Trash2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { DataTableShell, SectionToolbar, StatusBadge } from '@/components/system';
import { BatchUpdateDialog } from '@/components/admin/BatchUpdateDialog';
import { getRoleAuthorityTier } from '@/components/admin/admin-authority';
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
      <DataTableShell
        density="compact"
        title="Employee Management"
        description="View, filter, update, and archive employee profiles"
        headerActions={
          <SectionToolbar
            variant="inline"
            ariaLabel="Employee management filters"
            density="compact"
            search={{
              value: search,
              onChange: onSearchChange,
              placeholder: 'Search employees...',
              ariaLabel: 'Search employees',
              inputProps: { className: 'h-9 pl-10' },
            }}
            filters={[
              {
                id: 'employee-status-filter',
                label: 'Status',
                minWidthClassName: 'sm:min-w-[160px]',
                control: (
                  <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as EmployeeStatus | 'all')}>
                    <SelectTrigger className="h-9 w-full rounded-full">
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
                ),
              },
              {
                id: 'employee-department-filter',
                label: 'Department',
                minWidthClassName: 'sm:min-w-[180px]',
                control: (
                  <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
                    <SelectTrigger className="h-9 w-full rounded-full">
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
                ),
              },
            ]}
            actions={
              canManageEmployeeProfiles ? (
                <Button
                  variant="outline"
                  className="h-9 w-full rounded-full sm:w-auto"
                  onClick={() => onBatchUpdateDialogOpenChange(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Batch Update
                </Button>
              ) : null
            }
          />
        }
        loading={employeesLoading}
        loadingSkeleton={
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        }
        content={
          <>
              <div className="space-y-3 md:hidden">
                {filteredEmployees?.map((employee) => {
                  const currentRole = getUserRole(employee.id);
                  const tier = getRoleAuthorityTier(currentRole);
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
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge className={roleColors[currentRole]}>{currentRole}</Badge>
                            <Badge variant="outline">{tier.shortLabel}</Badge>
                          </div>
                        </div>
                        <div className="rounded-md bg-muted/40 px-3 py-2">
                          <p className="text-muted-foreground">Status</p>
                          <StatusBadge
                            status={employee.status === 'terminated' ? 'error' : employee.status}
                            labelOverride={employee.status.replace('_', ' ')}
                            className="mt-1"
                          />
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
                      {filteredEmployees?.map((employee) => {
                        const employeeRole = getUserRole(employee.id);
                        const tier = getRoleAuthorityTier(employeeRole);
                        return (
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
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge className={roleColors[employeeRole]}>
                                {employeeRole}
                              </Badge>
                              <Badge variant="outline">{tier.shortLabel}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={employee.status === 'terminated' ? 'error' : employee.status}
                              labelOverride={employee.status.replace('_', ' ')}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canOpenAccountProfileEditor && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-full"
                                  title={isAdminLimitedProfileEditor ? 'Edit username alias' : 'Edit profile'}
                                  aria-label={`${isAdminLimitedProfileEditor ? 'Edit username alias' : 'Edit profile'} for ${employee.first_name} ${employee.last_name}`}
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
                                  aria-label={`Reset password for ${employee.first_name} ${employee.last_name}`}
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
                                    aria-label={`Restore ${employee.first_name} ${employee.last_name}`}
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
                                    aria-label={`Archive ${employee.first_name} ${employee.last_name}`}
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
                      )})}
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
        }
      />

      <BatchUpdateDialog
        open={batchUpdateDialogOpen}
        onOpenChange={onBatchUpdateDialogOpenChange}
        employees={employees}
        departments={departments}
      />
    </div>
  );
}
