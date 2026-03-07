import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DepartmentsPage } from '@/modules/departments';
import { WorkspaceTransitionNotice } from '@/components/workspace/WorkspaceTransitionNotice';

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
    <div className="space-y-4">
      <WorkspaceTransitionNotice
        title="Department management now lives in the department workspace"
        description="This admin path remains available for compatibility, but the canonical surface for staffing and structure changes is the department module."
        destination="/departments"
        actionLabel="Open Department Workspace"
        supportingText="Use this route only when you need a legacy admin bookmark or wrapper-specific access path."
      />
      <DepartmentsPage entryContext="admin" adminCapabilitiesOverride={capabilities} />
    </div>
  );
}
