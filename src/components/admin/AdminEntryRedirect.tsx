import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyAdminCapabilities } from '@/hooks/admin/useAdminCapabilities';
import type { AdminCapabilityKey } from '@/lib/admin-capabilities';

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
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const defaultPath =
    ADMIN_LANDING_ORDER.find((candidate) => capabilityMap[candidate.capability])?.path ??
    '/dashboard';

  return <Navigate to={defaultPath} replace />;
}
