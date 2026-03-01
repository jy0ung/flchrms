import type { AppRole } from '@/types/hrms';
import {
  canAccessAdminPage,
  isAdmin,
  isDirector,
  isHr,
} from '@/lib/permissions';

export type AdminCapabilities = {
  canAccessAdminPage: boolean;
  canManageEmployeeProfiles: boolean;
  canCreateEmployee: boolean;
  canManageDepartments: boolean;
  canManageLeaveTypes: boolean;
  canManageRoles: boolean;
  canResetEmployeePasswords: boolean;
  canOpenAccountProfileEditor: boolean;
  isAdminLimitedProfileEditor: boolean;
  canViewSensitiveEmployeeIdentifiers: boolean;
};

export function getAdminCapabilities(role: AppRole | null | undefined): AdminCapabilities {
  const canManageEmployeeProfiles = isHr(role) || isDirector(role);
  const canCreateEmployee = isHr(role) || isDirector(role);
  const canManageDepartments = isAdmin(role) || isHr(role) || isDirector(role);
  const canManageLeaveTypes = isAdmin(role) || isHr(role) || isDirector(role);
  const canManageRoles = isAdmin(role) || isDirector(role);
  const canResetEmployeePasswords = isAdmin(role) || isHr(role);
  const isAdminLimitedProfileEditor = isAdmin(role);

  return {
    canAccessAdminPage: canAccessAdminPage(role),
    canManageEmployeeProfiles,
    canCreateEmployee,
    canManageDepartments,
    canManageLeaveTypes,
    canManageRoles,
    canResetEmployeePasswords,
    canOpenAccountProfileEditor: canManageEmployeeProfiles || isAdmin(role),
    isAdminLimitedProfileEditor,
    canViewSensitiveEmployeeIdentifiers: !isAdmin(role),
  };
}

export function getRolePermissionSummary(role: AppRole): string {
  if (role === 'admin') {
    return 'System administration and app configuration (no payroll/salary or sensitive employee identifiers)';
  }
  if (role === 'hr') {
    return 'Employee management, policies, leave monitoring (view-only leave status)';
  }
  if (role === 'director') {
    return 'Unrestricted business access and final leave approvals';
  }
  if (role === 'general_manager') {
    return 'GM level leave approvals, team oversight';
  }
  if (role === 'manager') {
    return 'Team oversight, leave approval, performance reviews';
  }
  return 'Self-service, own data access';
}
