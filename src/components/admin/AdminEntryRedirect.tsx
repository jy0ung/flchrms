import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAdminCapabilities } from '@/hooks/admin/useAdminCapabilities';
import type { AdminCapabilityKey } from '@/lib/admin-capabilities';
import { AdminQuickActionsLoadingSkeleton } from './AdminLoadingSkeletons';

const ADMIN_LANDING_ORDER: Array<{ path: string; capability: AdminCapabilityKey }> = [
  { path: '/admin/dashboard', capability: 'view_admin_dashboard' },
  { path: '/admin/quick-actions', capability: 'view_admin_quick_actions' },
  { path: '/admin/roles', capability: 'manage_roles' },
  { path: '/admin/leave-policies', capability: 'manage_leave_policies' },
  { path: '/admin/announcements', capability: 'manage_announcements' },
  { path: '/admin/audit-log', capability: 'view_admin_audit_log' },
  { path: '/admin/settings', capability: 'manage_admin_settings' },
  { path: '/admin/employees', capability: 'manage_employee_directory' },
  { path: '/admin/departments', capability: 'manage_departments' },
];

export function AdminEntryRedirect() {
  const { role } = useAuth();
  const { capabilityMap, isLoading } = useMyAdminCapabilities(role);

  if (isLoading) {
    return (
      <AdminQuickActionsLoadingSkeleton
        title="Loading governance hub"
        description="Checking available governance destinations for your role."
      />
    );
  }

  const defaultPath =
    ADMIN_LANDING_ORDER.find((candidate) => capabilityMap[candidate.capability])?.path ??
    '/dashboard';

  return <Navigate to={defaultPath} replace />;
}
