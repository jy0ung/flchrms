import { AlertTriangle, UserCog } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Role Management
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Admin/Director
                </Badge>
              </CardTitle>
              <CardDescription>Assign and modify user roles. Be careful - changes take effect immediately.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <Table>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
