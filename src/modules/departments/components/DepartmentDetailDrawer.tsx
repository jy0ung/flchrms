import { format } from 'date-fns';
import { Building2, CalendarDays, Info, UserSquare2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleLayout } from '@/layouts/ModuleLayout';

import type {
  DepartmentDrawerTab,
  DepartmentRecord,
  DepartmentRowActionPermissions,
} from '../types';

interface DepartmentDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: DepartmentRecord | null;
  loading: boolean;
  isUnavailable: boolean;
  tab: DepartmentDrawerTab;
  onTabChange: (tab: DepartmentDrawerTab) => void;
  rowPermissions: DepartmentRowActionPermissions | null;
  onEditDepartment: (department: DepartmentRecord) => void;
  onDeleteDepartment: (department: DepartmentRecord) => void;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'PPp');
}

export function DepartmentDetailDrawer({
  open,
  onOpenChange,
  department,
  loading,
  isUnavailable,
  tab,
  onTabChange,
  rowPermissions,
  onEditDepartment,
  onDeleteDepartment,
}: DepartmentDetailDrawerProps) {
  const footer = department && rowPermissions ? (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
      {rowPermissions.canEditDepartment ? (
        <Button variant="outline" onClick={() => onEditDepartment(department)}>
          Edit Department
        </Button>
      ) : null}
      {rowPermissions.canDeleteDepartment ? (
        <Button variant="destructive" onClick={() => onDeleteDepartment(department)}>
          Delete Department
        </Button>
      ) : null}
    </div>
  ) : undefined;

  return (
    <ModuleLayout.DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={department?.name ?? 'Department details'}
      description={department?.description ?? 'Overview, membership, and ownership for the selected department.'}
      footer={footer}
    >
      {loading ? <p className="text-sm text-muted-foreground">Loading department details...</p> : null}
      {isUnavailable ? <p className="text-sm text-muted-foreground">This department is not available in the current workspace.</p> : null}

      {!loading && !isUnavailable && department ? (
        <Tabs value={tab} onValueChange={(next) => onTabChange(next as DepartmentDrawerTab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="manager">Manager</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Department Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm">{department.description || 'No department description yet.'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
                  <p className="mt-1 text-sm">{department.memberCount} assigned employee{department.memberCount === 1 ? '' : 's'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm">{formatTimestamp(department.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Updated</p>
                  <p className="mt-1 text-sm">{formatTimestamp(department.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-0 space-y-3">
            {department.members.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No employees are assigned to this department.
                </CardContent>
              </Card>
            ) : (
              department.members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">{member.job_title || 'No title assigned'}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{member.status.replace(/_/g, ' ')}</p>
                      <p>{member.employee_id || 'No employee ID'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="manager" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserSquare2 className="h-4 w-4" />
                  Department Manager
                </CardTitle>
              </CardHeader>
              <CardContent>
                {department.manager ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{department.manager.first_name} {department.manager.last_name}</p>
                    <p className="text-muted-foreground">{department.manager.job_title || 'No title assigned'}</p>
                    <p className="text-muted-foreground">{department.manager.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No manager is assigned to this department.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4" />
                  Department Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Department created</p>
                    <p className="text-muted-foreground">{formatTimestamp(department.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Current membership snapshot</p>
                    <p className="text-muted-foreground">{department.memberCount} active record{department.memberCount === 1 ? '' : 's'} currently assigned.</p>
                  </div>
                </div>
                {department.updated_at !== department.created_at ? (
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Department updated</p>
                      <p className="text-muted-foreground">{formatTimestamp(department.updated_at)}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </ModuleLayout.DetailDrawer>
  );
}
