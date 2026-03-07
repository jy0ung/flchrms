import { format } from 'date-fns';
import { Building2, CalendarDays, Info, UserSquare2, Users } from 'lucide-react';

import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DrawerMetaHeader } from '@/components/workspace/DrawerMetaHeader';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
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
  const activityItems = department ? [
    {
      id: 'department-created',
      at: department.created_at,
      title: 'Department created',
      description: 'Initial department record was created.',
      kind: 'create' as const,
    },
    {
      id: 'department-membership',
      at: department.updated_at,
      title: 'Membership snapshot',
      description: `${department.memberCount} assigned employee${department.memberCount === 1 ? '' : 's'} currently tracked.`,
      kind: 'status_change' as const,
    },
    ...(department.updated_at !== department.created_at
      ? [{
          id: 'department-updated',
          at: department.updated_at,
          title: 'Department updated',
          description: 'Department details or ownership changed.',
          kind: 'update' as const,
        }]
      : []),
  ] : [];

  return (
    <ModuleLayout.DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={department?.name ?? 'Department details'}
      description={department?.description ?? 'Overview, membership, and ownership for the selected department.'}
    >
      {loading ? (
        <WorkspaceStatePanel
          title="Loading department details"
          description="Pulling department ownership, members, and activity for the selected record."
        />
      ) : null}
      {isUnavailable ? (
        <WorkspaceStatePanel
          title="Department unavailable"
          description="This department is not available in the current workspace."
        />
      ) : null}

      {!loading && !isUnavailable && department ? (
        <Tabs value={tab} onValueChange={(next) => onTabChange(next as DepartmentDrawerTab)} className="space-y-4">
          <DrawerMetaHeader
            badges={(
              <>
                <Badge variant="outline">{department.memberCount} member{department.memberCount === 1 ? '' : 's'}</Badge>
                <Badge variant="outline">
                  {department.manager ? 'Manager assigned' : 'Manager unassigned'}
                </Badge>
              </>
            )}
            description={department.description || 'No department description yet.'}
            metaItems={[
              {
                id: 'manager',
                label: 'Manager',
                value: department.manager
                  ? `${department.manager.first_name} ${department.manager.last_name}`
                  : 'Unassigned',
                icon: UserSquare2,
              },
              {
                id: 'members',
                label: 'Members',
                value: `${department.memberCount} assigned`,
                icon: Users,
              },
              {
                id: 'created',
                label: 'Created',
                value: formatTimestamp(department.created_at),
                icon: CalendarDays,
              },
              {
                id: 'updated',
                label: 'Last updated',
                value: formatTimestamp(department.updated_at),
                icon: CalendarDays,
              },
            ]}
          />

          {rowPermissions ? (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Workspace actions</p>
                <p className="text-xs text-muted-foreground">
                  Department maintenance stays inside the module workspace.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
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
            </div>
          ) : null}

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
            <ActivityTimeline
              items={activityItems}
              title="Department Activity"
              emptyMessage="No department activity has been recorded yet."
              formatTimestamp={formatTimestamp}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </ModuleLayout.DetailDrawer>
  );
}
