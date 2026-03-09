import { AdminWorkspaceBridge } from '@/components/admin/AdminWorkspaceBridge';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { ADMIN_WORKSPACE_BRIDGES } from '@/components/admin/admin-workspace-bridges';
import { EmployeesPage } from '@/modules/employees';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export default function AdminEmployeesPage() {
  const { role } = useAuth();
  const { capabilities, isLoading } = useAdminPageCapabilities(role);

  if (isLoading) {
    return null;
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
