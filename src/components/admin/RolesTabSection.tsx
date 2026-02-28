import { AlertTriangle, UserCog } from 'lucide-react';
import { format } from 'date-fns';
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
import { canManageTargetRole, getRoleAuthorityTier } from '@/components/admin/admin-authority';
import type { AppRole, Profile, UserRole } from '@/types/hrms';

interface RolesTabSectionProps {
  rolesLoading: boolean;
  employees?: Profile[];
  userRoles?: UserRole[];
  getUserRole: (userId: string) => AppRole;
  roleColors: Record<AppRole, string>;
  viewerRole: AppRole;
  canManageRoles: boolean;
  onEditRole: (employee: Profile) => void;
}

export function RolesTabSection({
  rolesLoading,
  employees,
  userRoles,
  getUserRole,
  roleColors,
  viewerRole,
  canManageRoles,
  onEditRole,
}: RolesTabSectionProps) {
  const roleAssignmentsByUserId = new Map((userRoles ?? []).map((entry) => [entry.user_id, entry]));

  const getRoleActionState = (targetRole: AppRole) => {
    if (!canManageRoles) {
      return {
        disabled: true,
        reason: 'You do not have role-management privileges.',
      };
    }

    if (!canManageTargetRole(viewerRole, targetRole)) {
      return {
        disabled: true,
        reason: 'Equal-tier or higher-tier roles cannot be changed from this account.',
      };
    }

    return {
      disabled: false,
      reason: undefined,
    };
  };

  return (
    <div className="space-y-4">
      <DataTableShell
        density="compact"
        title="Role Management"
        description="Assign and modify user roles with authority-tier safeguards."
        headerActions={
          <StatusBadge
            status="warning"
            labelOverride="Role Governance"
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
                  const tier = getRoleAuthorityTier(currentRole);
                  const roleAssignment = roleAssignmentsByUserId.get(employee.id);
                  const actionState = getRoleActionState(currentRole);
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
                          <Badge variant="outline" className="mt-2 ml-2">
                            {tier.shortLabel}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        {getRolePermissionSummary(currentRole)}
                      </div>
                      <div className="mt-2 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                        Last modified: {format(new Date(roleAssignment?.created_at ?? employee.updated_at), 'MMM d, yyyy')} · by System
                      </div>
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-full"
                          onClick={() => onEditRole(employee)}
                          disabled={actionState.disabled}
                          title={actionState.reason}
                          aria-label={`Change role for ${employee.first_name} ${employee.last_name}`}
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
                  <Table className="min-w-[1220px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Authority Tier</TableHead>
                        <TableHead>Last Modified By</TableHead>
                        <TableHead>Last Modified Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                      {employees?.map((employee) => {
                        const currentRole = getUserRole(employee.id);
                        const tier = getRoleAuthorityTier(currentRole);
                        const roleAssignment = roleAssignmentsByUserId.get(employee.id);
                        const actionState = getRoleActionState(currentRole);
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
                            <TableCell>
                              <Badge variant="outline">{tier.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">System</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(roleAssignment?.created_at ?? employee.updated_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => onEditRole(employee)}
                                disabled={actionState.disabled}
                                title={actionState.reason}
                                aria-label={`Change role for ${employee.first_name} ${employee.last_name}`}
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
