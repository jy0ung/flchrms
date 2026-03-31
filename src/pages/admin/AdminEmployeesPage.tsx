import { AdminWorkspaceBridge } from '@/components/admin/AdminWorkspaceBridge';
import { AdminDirectoryLoadingSkeleton } from '@/components/admin/AdminLoadingSkeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { ADMIN_WORKSPACE_BRIDGES } from '@/components/admin/admin-workspace-bridges';
import { EmployeesPage } from '@/modules/employees';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { PageHeader } from '@/components/system';

export default function AdminEmployeesPage() {
  const { role } = useAuth();
  const { capabilities, isLoading } = useAdminPageCapabilities(role);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Employee Workspace"
          description="Preparing the employee workspace bridge and capability checks."
        />
        <AdminDirectoryLoadingSkeleton
          title="Loading employee workspace"
          description="Checking employee-management capabilities and preparing the workspace bridge."
          workspaceTitle="Employee directory"
          workspaceDescription="Preparing the canonical people workspace, filters, and record list."
        />
      </div>
    );
  }

  if (!capabilities.canManageEmployeeProfiles) {
    return (
      <AdminAccessDenied
        title="Employee management is disabled"
        description="Your account does not have the capability to manage employee records."
      />
    );
  }

  return (
    <AdminWorkspaceBridge bridge={ADMIN_WORKSPACE_BRIDGES.employees}>
      <EmployeesPage entryContext="admin" adminCapabilitiesOverride={capabilities} />
    </AdminWorkspaceBridge>
  );
}
