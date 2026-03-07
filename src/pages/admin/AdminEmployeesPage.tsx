import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { EmployeesPage } from '@/modules/employees';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { WorkspaceTransitionNotice } from '@/components/workspace/WorkspaceTransitionNotice';

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
    <div className="space-y-4">
      <WorkspaceTransitionNotice
        title="Employee management now lives in the employee workspace"
        description="This admin path is still available for compatibility, but the canonical surface for directory work, bulk actions, and profile updates is the employee module."
        destination="/employees"
        actionLabel="Open Employee Workspace"
        supportingText="Use this route only when you need a legacy admin bookmark or wrapper-specific access path."
      />
      <EmployeesPage entryContext="admin" adminCapabilitiesOverride={capabilities} />
    </div>
  );
}
