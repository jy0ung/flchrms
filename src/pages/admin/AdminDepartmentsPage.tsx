import { AdminWorkspaceBridge } from '@/components/admin/AdminWorkspaceBridge';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ADMIN_WORKSPACE_BRIDGES } from '@/components/admin/admin-workspace-bridges';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DepartmentsPage } from '@/modules/departments';
import { PageHeader, RouteLoadingState } from '@/components/system';

export default function AdminDepartmentsPage() {
  usePageTitle('Admin · Departments');

  const { role } = useAuth();
  const { capabilities, isLoading } = useAdminPageCapabilities(role);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Department Workspace"
          description="Preparing the department workspace bridge and capability checks."
        />
        <RouteLoadingState
          title="Loading department workspace"
          description="Checking department-management capabilities and preparing the workspace bridge."
        />
      </div>
    );
  }

  if (!capabilities.canManageDepartments) {
    return (
      <AdminAccessDenied
        title="Department management is disabled"
        description="Your account does not have the capability to manage departments."
      />
    );
  }

  return (
    <AdminWorkspaceBridge bridge={ADMIN_WORKSPACE_BRIDGES.departments}>
      <DepartmentsPage entryContext="admin" adminCapabilitiesOverride={capabilities} />
    </AdminWorkspaceBridge>
  );
}
