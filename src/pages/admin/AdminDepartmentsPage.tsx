import { AdminWorkspaceBridge } from '@/components/admin/AdminWorkspaceBridge';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ADMIN_WORKSPACE_BRIDGES } from '@/components/admin/admin-workspace-bridges';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DepartmentsPage } from '@/modules/departments';

export default function AdminDepartmentsPage() {
  usePageTitle('Admin · Departments');

  const { role } = useAuth();
  const { capabilities, isLoading } = useAdminPageCapabilities(role);

  if (isLoading) {
    return null;
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
