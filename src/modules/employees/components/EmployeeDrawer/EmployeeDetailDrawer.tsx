import { useMemo, useState } from 'react';
import { Building2, Loader2, Mail, Phone, UserSquare2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useDocuments, useGetDocumentSignedUrl, type Document } from '@/hooks/useDocuments';
import {
  useEmployeeLifecycle,
  useEmployeeProfile,
  type LifecycleEvent,
} from '@/hooks/useEmployeeLifecycle';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useEmployee, useProfileChangeLog, type ProfileChangeLogEntry } from '@/hooks/useEmployees';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/system';
import { DrawerMetaHeader } from '@/components/workspace/DrawerMetaHeader';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import type { AppRole } from '@/types/hrms';

import type { DirectoryEmployee } from '../EmployeeTable';
import { EmployeeDrawerActions } from './EmployeeDrawerActions';
import { EmployeeDrawerTabs } from './EmployeeDrawerTabs';
import { ActivityTab } from './tabs/ActivityTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { EmploymentTab } from './tabs/EmploymentTab';
import { LeaveTab } from './tabs/LeaveTab';
import { ProfileTab } from './tabs/ProfileTab';
import type { EmployeeActivityItem, EmployeeDrawerTab } from '../../types';
import { useEmployeeModuleCapabilities } from '../../hooks/useEmployeeModuleCapabilities';

interface EmployeeDetailDrawerProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: EmployeeDrawerTab;
  onTabChange: (tab: EmployeeDrawerTab) => void;
  getUserRole: (userId: string) => AppRole;
  roleColors: Record<AppRole, string>;
  getManagerName: (managerId: string | null | undefined) => string | null;
  adminCapabilitiesOverride?: import('@/lib/admin-permissions').AdminCapabilities;
  onEditProfile: (employee: DirectoryEmployee) => void;
  onResetPassword: (employee: DirectoryEmployee) => void;
  onEditRole: (employee: DirectoryEmployee) => void;
  onArchiveEmployee: (employee: DirectoryEmployee) => void;
  onRestoreEmployee: (employee: DirectoryEmployee) => void;
}

function formatRoleLabel(role: AppRole) {
  return role.replace(/_/g, ' ');
}

function getInitials(employee: Pick<DirectoryEmployee, 'first_name' | 'last_name'>) {
  return `${employee.first_name[0] ?? ''}${employee.last_name[0] ?? ''}`;
}

function buildProfileChangeDescription(entry: ProfileChangeLogEntry) {
  if (entry.change_type === 'create') {
    return 'Employee profile created.';
  }

  if (entry.change_type === 'archive') {
    return 'Employee profile archived.';
  }

  if (entry.change_type === 'restore') {
    return 'Employee profile restored.';
  }

  if (!entry.field_name) {
    return 'Employee profile updated.';
  }

  if (entry.old_value || entry.new_value) {
    return `${entry.field_name} changed from ${entry.old_value || 'empty'} to ${entry.new_value || 'empty'}.`;
  }

  return `${entry.field_name} updated.`;
}

function mapProfileChanges(entries: ProfileChangeLogEntry[]): EmployeeActivityItem[] {
  return entries.map((entry) => ({
    id: `profile-${entry.id}`,
    at: entry.changed_at,
    type: 'profile_change',
    title:
      entry.change_type === 'update'
        ? `Updated ${entry.field_name?.replace(/_/g, ' ') || 'profile'}`
        : entry.change_type[0].toUpperCase() + entry.change_type.slice(1),
    description: buildProfileChangeDescription(entry),
  }));
}

function mapLifecycleEvents(events: LifecycleEvent[]): EmployeeActivityItem[] {
  return events.map((event) => ({
    id: `lifecycle-${event.id}`,
    at: event.event_date || event.created_at,
    type: 'lifecycle',
    title: event.title,
    description: event.description,
  }));
}

export function EmployeeDetailDrawer({
  employeeId,
  open,
  onOpenChange,
  tab,
  onTabChange,
  getUserRole,
  roleColors,
  getManagerName,
  adminCapabilitiesOverride,
  onEditProfile,
  onResetPassword,
  onEditRole,
  onArchiveEmployee,
  onRestoreEmployee,
}: EmployeeDetailDrawerProps) {
  const { role } = useAuth();
  const { getRowPermissions } = useEmployeeModuleCapabilities({ adminCapabilitiesOverride });
  const { data: employee, isLoading: employeeLoading, error } = useEmployee(employeeId ?? '');
  const { data: extendedProfile } = useEmployeeProfile(employeeId ?? undefined);
  const profileChangeLogQuery = useProfileChangeLog(employeeId);
  const lifecycleQuery = useEmployeeLifecycle(employeeId ?? undefined);
  const getDocumentSignedUrl = useGetDocumentSignedUrl();
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);

  const isDrawerActive = open && !!employeeId;
  const permissions = employee ? getRowPermissions(employee) : null;
  const activeTab = tab === 'documents' && !permissions?.canOpenDocumentsTab ? 'profile' : tab;
  const shouldLoadLeave = isDrawerActive && activeTab === 'leave';
  const shouldLoadDocuments = isDrawerActive && activeTab === 'documents' && !!permissions?.canOpenDocumentsTab;
  const leaveBalanceQuery = useLeaveBalance(employeeId ?? undefined, undefined, { enabled: shouldLoadLeave });
  const documentsQuery = useDocuments(employeeId ?? undefined, { enabled: shouldLoadDocuments });
  const assignedRole = employee ? getUserRole(employee.id) : 'employee';
  const managerName = getManagerName(employee?.manager_id);
  const showSensitiveSection = role === 'admin' || role === 'hr' || role === 'director';
  const metaItems = employee ? [
    {
      id: 'email',
      label: 'Email',
      value: employee.email,
      icon: Mail,
    },
    {
      id: 'phone',
      label: 'Phone',
      value: employee.phone || 'Not provided',
      icon: Phone,
    },
    {
      id: 'department',
      label: 'Department',
      value: employee.department?.name || 'Unassigned',
      icon: Building2,
    },
    {
      id: 'manager',
      label: 'Manager',
      value: managerName || 'Unassigned',
      icon: UserSquare2,
    },
  ] : [];

  const activityItems = useMemo(() => {
    const profileItems = mapProfileChanges(profileChangeLogQuery.data ?? []);
    const lifecycleItems = mapLifecycleEvents(lifecycleQuery.data ?? []);

    return [...profileItems, ...lifecycleItems]
      .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
      .slice(0, 25);
  }, [lifecycleQuery.data, profileChangeLogQuery.data]);

  const handleOpenDocument = async (document: Document) => {
    setOpeningDocumentId(document.id);
    try {
      const signedUrl = await getDocumentSignedUrl.mutateAsync(document.file_url);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (documentError) {
      const message = documentError instanceof Error ? documentError.message : 'Unable to open document.';
      toast.error('Document open failed', { description: message });
    } finally {
      setOpeningDocumentId(null);
    }
  };

  return (
    <ModuleLayout.DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={employee ? `${employee.first_name} ${employee.last_name}` : 'Employee details'}
      description={employee ? employee.job_title || employee.email : 'Employee detail workspace'}
      contentClassName="sm:max-w-2xl"
      bodyClassName="pb-4"
    >
      {employeeLoading ? (
        <WorkspaceStatePanel
          title="Loading employee details"
          description="Pulling profile, role, and contextual workspace data for the selected employee."
          icon={Loader2}
          animateIcon
          appearance="default"
        />
      ) : !employee || error ? (
        <WorkspaceStatePanel
          title="Employee record not found"
          description="The selected employee could not be loaded from the directory."
        />
      ) : (
        <>
          <DrawerMetaHeader
            leading={(
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                  {getInitials(employee)}
                </AvatarFallback>
              </Avatar>
            )}
            badges={(
              <>
                <StatusBadge status={employee.status} />
                <Badge className={`border ${roleColors[assignedRole]}`}>
                  {formatRoleLabel(assignedRole)}
                </Badge>
              </>
            )}
            description={employee.job_title || 'No title assigned'}
            metaItems={metaItems}
          />

          {permissions ? (
            <EmployeeDrawerActions
              employee={employee}
              permissions={permissions}
              onEditProfile={onEditProfile}
              onResetPassword={onResetPassword}
              onEditRole={onEditRole}
              onArchiveEmployee={onArchiveEmployee}
              onRestoreEmployee={onRestoreEmployee}
            />
          ) : null}

          <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as EmployeeDrawerTab)} className="space-y-4">
            <EmployeeDrawerTabs value={activeTab} canOpenDocumentsTab={permissions?.canOpenDocumentsTab ?? false} />

            <TabsContent value="profile" className="space-y-4">
              <ProfileTab employee={employee} assignedRole={assignedRole} managerName={managerName} />
            </TabsContent>
            <TabsContent value="employment" className="space-y-4">
              <EmploymentTab
                employee={employee}
                extendedProfile={extendedProfile}
                managerName={managerName}
                showSensitiveSection={showSensitiveSection}
              />
            </TabsContent>
            <TabsContent value="leave" className="space-y-4">
              <LeaveTab balances={leaveBalanceQuery.data} isLoading={leaveBalanceQuery.isLoading} />
            </TabsContent>
            {permissions?.canOpenDocumentsTab ? (
              <TabsContent value="documents" className="space-y-4">
                <DocumentsTab
                  documents={documentsQuery.data}
                  isLoading={documentsQuery.isLoading}
                  openingDocumentId={openingDocumentId}
                  onOpenDocument={handleOpenDocument}
                />
              </TabsContent>
            ) : null}
            <TabsContent value="activity" className="space-y-4">
              <ActivityTab
                items={activityItems}
                isLoading={profileChangeLogQuery.isLoading || lifecycleQuery.isLoading}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </ModuleLayout.DetailDrawer>
  );
}
