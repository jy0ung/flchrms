import { AlertTriangle, UserCog } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { DataTableShell, StatusBadge } from '@/components/system';
import { getRolePermissionSummary } from '@/lib/admin-permissions';
import type { AppRole, Profile } from '@/types/hrms';

interface RolesTabSectionProps {
  rolesLoading: boolean;
  employees?: Profile[];
  getUserRole: (userId: string) => AppRole;
  roleColors: Record<AppRole, string>;
  canManageRoles: boolean;
  onEditRole: (employee: Profile) => void;
}

export function RolesTabSection({
  rolesLoading,
  employees,
  getUserRole,
  roleColors,
  canManageRoles,
  onEditRole,
}: RolesTabSectionProps) {
  return (
    <div className="space-y-4">
      <DataTableShell
        title="Role Management"
        description="Assign and modify user roles. Be careful - changes take effect immediately."
        headerActions={
          <StatusBadge
            status="warning"
            labelOverride="Admin/Director"
            showIcon
            className="text-xs"
          />
        }
        loading={rolesLoading}
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
                {employees?.map((employee) => {
                  const currentRole = getUserRole(employee.id);
                  return (
                    <div key={employee.id} className="rounded-xl border p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                          <p className="text-sm text-muted-foreground">{employee.job_title || 'No title'}</p>
                          <Badge className={`${roleColors[currentRole]} mt-2`}>{currentRole}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        {getRolePermissionSummary(currentRole)}
                      </div>
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-full"
                          onClick={() => onEditRole(employee)}
                          disabled={!canManageRoles}
                        >
                          <UserCog className="w-4 h-4 mr-2" />
                          Change Role
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden rounded-xl border md:block">
                <div className="overflow-x-auto">
                  <Table className="min-w-[880px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                      {employees?.map((employee) => {
                        const currentRole = getUserRole(employee.id);
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
                                  <p className="text-sm text-muted-foreground">{employee.job_title || 'No title'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={roleColors[currentRole]}>
                                {currentRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {getRolePermissionSummary(currentRole)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => onEditRole(employee)}
                                disabled={!canManageRoles}
                              >
                                <UserCog className="w-4 h-4 mr-2" />
                                Change Role
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
