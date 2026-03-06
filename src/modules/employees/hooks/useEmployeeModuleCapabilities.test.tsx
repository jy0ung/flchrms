import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEmployeeModuleCapabilities } from '@/modules/employees/hooks/useEmployeeModuleCapabilities';

const authState = {
  user: { id: 'user-1' },
  role: 'manager' as import('@/types/hrms').AppRole,
};

const capabilityState = {
  capabilities: {
    canAccessAdminPage: false,
    canViewAdminDashboard: false,
    canViewAdminQuickActions: false,
    canViewAdminAuditLog: false,
    canManageEmployeeProfiles: false,
    canCreateEmployee: false,
    canManageDepartments: false,
    canManageLeaveTypes: false,
    canManageAnnouncements: false,
    canManageRoles: false,
    canResetEmployeePasswords: false,
    canManageAdminSettings: false,
    canOpenAccountProfileEditor: false,
    isAdminLimitedProfileEditor: false,
    canViewSensitiveEmployeeIdentifiers: false,
  },
  isLoading: false,
  capabilityMap: {} as never,
  isError: false,
  isFallback: true,
  error: null,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => capabilityState,
}));

describe('useEmployeeModuleCapabilities', () => {
  beforeEach(() => {
    authState.user = { id: 'user-1' };
    authState.role = 'manager';
    capabilityState.capabilities = {
      canAccessAdminPage: false,
      canViewAdminDashboard: false,
      canViewAdminQuickActions: false,
      canViewAdminAuditLog: false,
      canManageEmployeeProfiles: false,
      canCreateEmployee: false,
      canManageDepartments: false,
      canManageLeaveTypes: false,
      canManageAnnouncements: false,
      canManageRoles: false,
      canResetEmployeePasswords: false,
      canManageAdminSettings: false,
      canOpenAccountProfileEditor: false,
      isAdminLimitedProfileEditor: false,
      canViewSensitiveEmployeeIdentifiers: false,
    };
  });

  it('grants manager_limited edit access for direct reports only', () => {
    const { result } = renderHook(() => useEmployeeModuleCapabilities());

    expect(result.current.getEditAccessMode({ manager_id: 'user-1' })).toBe('manager_limited');
    expect(result.current.getEditAccessMode({ manager_id: 'user-2' })).toBe('none');
    expect(result.current.pageActions.canBulkActions).toBe(false);

    const directReportPermissions = result.current.getRowPermissions({ manager_id: 'user-1' });
    expect(directReportPermissions.editAccessMode).toBe('manager_limited');
    expect(directReportPermissions.canResetPassword).toBe(false);
    expect(directReportPermissions.canManageRole).toBe(false);
    expect(directReportPermissions.canArchiveRestore).toBe(false);
  });

  it('grants full manage actions when employee profile management capability is enabled', () => {
    authState.role = 'hr';
    capabilityState.capabilities = {
      ...capabilityState.capabilities,
      canManageEmployeeProfiles: true,
      canCreateEmployee: true,
      canManageRoles: true,
      canResetEmployeePasswords: true,
      canViewSensitiveEmployeeIdentifiers: true,
    };

    const { result } = renderHook(() => useEmployeeModuleCapabilities());

    expect(result.current.getEditAccessMode({ manager_id: 'someone-else' })).toBe('full');
    expect(result.current.pageActions.canCreateEmployee).toBe(true);
    expect(result.current.pageActions.canBulkActions).toBe(true);
    expect(result.current.pageActions.canExportEmployees).toBe(true);

    const permissions = result.current.getRowPermissions({ manager_id: 'someone-else' });
    expect(permissions.canResetPassword).toBe(true);
    expect(permissions.canManageRole).toBe(true);
    expect(permissions.canArchiveRestore).toBe(true);
    expect(permissions.canOpenDocumentsTab).toBe(true);
  });

  it('treats alias_only editors as restricted and disables bulk actions', () => {
    authState.role = 'admin';
    capabilityState.capabilities = {
      ...capabilityState.capabilities,
      canManageEmployeeProfiles: true,
      canCreateEmployee: true,
      isAdminLimitedProfileEditor: true,
    };

    const { result } = renderHook(() => useEmployeeModuleCapabilities());

    expect(result.current.getEditAccessMode({ manager_id: 'n/a' })).toBe('alias_only');
    expect(result.current.pageActions.canCreateEmployee).toBe(false);
    expect(result.current.pageActions.canBulkActions).toBe(false);
    expect(result.current.getRowPermissions({ manager_id: 'n/a' }).canArchiveRestore).toBe(false);
  });
});
