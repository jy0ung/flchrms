import { useMemo } from 'react';
import { ChevronRight, Mail, Shield, UserSquare2 } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/system';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import type { AppRole, Department, Profile } from '@/types/hrms';

export type DirectoryEmployee = Profile & { department: Department | null };

interface EmployeeTableProps {
  employees?: DirectoryEmployee[];
  loading: boolean;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onOpenEmployee: (employee: DirectoryEmployee, trigger?: HTMLElement | null) => void;
  getUserRole: (userId: string) => AppRole;
  roleColors: Record<AppRole, string>;
  canSelectRows: boolean;
  canViewSensitiveIdentifiers: boolean;
}

function formatRoleLabel(role: AppRole) {
  return role.replace(/_/g, ' ');
}

function getInitials(employee: Pick<Profile, 'first_name' | 'last_name'>) {
  return `${employee.first_name[0] ?? ''}${employee.last_name[0] ?? ''}`;
}

export function EmployeeTable({
  employees,
  loading,
  selectedIds,
  onSelectedIdsChange,
  onOpenEmployee,
  getUserRole,
  roleColors,
  canSelectRows,
  canViewSensitiveIdentifiers,
}: EmployeeTableProps) {
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const employeeIds = useMemo(() => (employees ?? []).map((employee) => employee.id), [employees]);
  const allSelected = employeeIds.length > 0 && employeeIds.every((id) => selectedIdSet.has(id));

  const toggleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (!canSelectRows) {
      return;
    }

    if (checked) {
      onSelectedIdsChange(Array.from(new Set([...selectedIds, employeeId])));
      return;
    }

    onSelectedIdsChange(selectedIds.filter((id) => id !== employeeId));
  };

  const toggleAllSelection = (checked: boolean) => {
    if (!canSelectRows) {
      return;
    }

    onSelectedIdsChange(checked ? employeeIds : []);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 rounded bg-muted" />
                      <div className="h-3 w-2/3 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 rounded bg-muted" />
                    <div className="h-16 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="hidden border-border shadow-sm md:block">
          <CardContent className="p-4">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employees?.length) {
    return (
      <WorkspaceStatePanel
        title="No employees match the current filters"
        description="Adjust the search or filters to broaden the result set."
        icon={UserSquare2}
      />
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {employees.map((employee) => {
          const employeeRole = getUserRole(employee.id);
          const isSelected = selectedIdSet.has(employee.id);
          const employeeName = `${employee.first_name} ${employee.last_name}`;

          return (
            <Card
              key={employee.id}
              className="border-border shadow-sm transition-colors hover:border-accent/50"
            >
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                  {canSelectRows ? (
                    <div className="pt-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleEmployeeSelection(employee.id, checked === true)}
                        aria-label={`Select ${employeeName}`}
                      />
                    </div>
                  ) : null}
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(employee)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <StatusBadge status={employee.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{employee.job_title || 'No title assigned'}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {employee.email}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    aria-label={`Open employee record for ${employeeName}`}
                    onClick={(event) => onOpenEmployee(employee, event.currentTarget)}
                  >
                    Open record
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                    <p className="text-muted-foreground">Department</p>
                    <p className="mt-1 font-medium">{employee.department?.name || 'Unassigned'}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                    <p className="text-muted-foreground">Role</p>
                    <Badge className={`mt-1 border ${roleColors[employeeRole]}`}>
                      {formatRoleLabel(employeeRole)}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                    <p className="text-muted-foreground">Employee ID</p>
                    <p className="mt-1 font-mono text-[11px]">
                      {canViewSensitiveIdentifiers ? employee.employee_id || 'Not assigned' : 'Restricted'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                    <p className="text-muted-foreground">Username</p>
                    <p className="mt-1 truncate text-[11px]">{employee.username || 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="hidden border-border shadow-sm md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canSelectRows ? (
                    <TableHead className="w-14">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => toggleAllSelection(checked === true)}
                        aria-label="Select all employees"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[124px] text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const employeeRole = getUserRole(employee.id);
                  const isSelected = selectedIdSet.has(employee.id);
                  const employeeName = `${employee.first_name} ${employee.last_name}`;

                  return (
                    <TableRow key={employee.id} className="hover:bg-muted/30">
                      {canSelectRows ? (
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleEmployeeSelection(employee.id, checked === true)}
                            aria-label={`Select ${employeeName}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(employee)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium">{employeeName}</p>
                            <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
                            <p className="truncate text-xs text-muted-foreground">{employee.job_title || 'No title assigned'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.department?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Badge className={`border ${roleColors[employeeRole]}`}>
                          {formatRoleLabel(employeeRole)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            <span className="font-mono text-foreground">
                              {canViewSensitiveIdentifiers ? employee.employee_id || 'Not assigned' : 'Restricted'}
                            </span>
                          </div>
                          <p className="text-muted-foreground">@{employee.username || 'not-set'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={employee.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          aria-label={`Open employee record for ${employeeName}`}
                          onClick={(event) => onOpenEmployee(employee, event.currentTarget)}
                        >
                          Open
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
