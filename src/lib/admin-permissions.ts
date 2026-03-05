import type { AppRole } from '@/types/hrms';
import {
  type AdminCapabilityMap,
  getDefaultAdminCapabilityMap,
} from '@/lib/admin-capabilities';

export type AdminCapabilities = {
  canAccessAdminPage: boolean;
  canViewAdminDashboard: boolean;
  canViewAdminQuickActions: boolean;
  canViewAdminAuditLog: boolean;
  canManageEmployeeProfiles: boolean;
  canCreateEmployee: boolean;
  canManageDepartments: boolean;
  canManageLeaveTypes: boolean;
  canManageAnnouncements: boolean;
  canManageRoles: boolean;
  canResetEmployeePasswords: boolean;
  canManageAdminSettings: boolean;
  canOpenAccountProfileEditor: boolean;
  isAdminLimitedProfileEditor: boolean;
  canViewSensitiveEmployeeIdentifiers: boolean;
};

function resolveCapabilityMap(
  role: AppRole | null | undefined,
  effectiveCapabilities?: AdminCapabilityMap | null,
): AdminCapabilityMap {
  if (effectiveCapabilities) {
    return effectiveCapabilities;
  }

  return getDefaultAdminCapabilityMap(role);
}

export function getAdminCapabilities(
  role: AppRole | null | undefined,
  effectiveCapabilities?: AdminCapabilityMap | null,
): AdminCapabilities {
  const capabilityMap = resolveCapabilityMap(role, effectiveCapabilities);

  const canManageEmployeeProfiles = capabilityMap.manage_employee_directory;

  return {
    canAccessAdminPage: capabilityMap.access_admin_console,
    canViewAdminDashboard: capabilityMap.view_admin_dashboard,
    canViewAdminQuickActions: capabilityMap.view_admin_quick_actions,
    canViewAdminAuditLog: capabilityMap.view_admin_audit_log,
    canManageEmployeeProfiles,
    canCreateEmployee: capabilityMap.create_employee,
    canManageDepartments: capabilityMap.manage_departments,
    canManageLeaveTypes: capabilityMap.manage_leave_policies,
    canManageAnnouncements: capabilityMap.manage_announcements,
    canManageRoles: capabilityMap.manage_roles,
    canResetEmployeePasswords: capabilityMap.reset_employee_passwords,
    canManageAdminSettings: capabilityMap.manage_admin_settings,
    canOpenAccountProfileEditor: canManageEmployeeProfiles,
    isAdminLimitedProfileEditor: false,
    canViewSensitiveEmployeeIdentifiers: capabilityMap.view_sensitive_employee_identifiers,
  };
}

export function getRolePermissionSummary(role: AppRole): string {
  if (role === 'admin') {
    return 'Full system administration and capability governance.';
  }
  if (role === 'hr') {
    return 'Employee operations, leave policies, announcements, and admin dashboard controls.';
  }
  if (role === 'director') {
    return 'High-trust business operations and role governance with limited security controls.';
  }
  if (role === 'general_manager') {
    return 'Limited admin console access for dashboard, employee directory, and employee creation.';
  }
  if (role === 'manager') {
    return 'Team oversight, leave approvals, and performance workflows.';
  }
  return 'Self-service access to own profile and workflows.';
}
