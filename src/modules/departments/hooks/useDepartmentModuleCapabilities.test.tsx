import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDepartmentModuleCapabilities } from '@/modules/departments/hooks/useDepartmentModuleCapabilities';

const authState = {
  role: 'hr' as import('@/types/hrms').AppRole,
};

const capabilityState = {
  capabilities: {
    canAccessAdminPage: false,
    canViewAdminDashboard: false,
    canViewAdminQuickActions: false,
    canViewAdminAuditLog: false,
    canManageEmployeeProfiles: false,
    canCreateEmployee: false,
    canManageDepartments: true,
    canManageLeaveTypes: false,
    canManageAnnouncements: false,
    canManageRoles: false,
    canResetEmployeePasswords: false,
    canManageAdminSettings: false,
    canOpenAccountProfileEditor: false,
    isAdminLimitedProfileEditor: false,
    canViewSensitiveEmployeeIdentifiers: true,
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

describe('useDepartmentModuleCapabilities', () => {
  beforeEach(() => {
    authState.role = 'hr';
    capabilityState.capabilities = {
      canAccessAdminPage: false,
      canViewAdminDashboard: false,
      canViewAdminQuickActions: false,
      canViewAdminAuditLog: false,
      canManageEmployeeProfiles: false,
      canCreateEmployee: false,
      canManageDepartments: true,
      canManageLeaveTypes: false,
      canManageAnnouncements: false,
      canManageRoles: false,
      canResetEmployeePasswords: false,
      canManageAdminSettings: false,
      canOpenAccountProfileEditor: false,
      isAdminLimitedProfileEditor: false,
      canViewSensitiveEmployeeIdentifiers: true,
    };
  });

  it('enables department actions when department management capability is present', () => {
    const { result } = renderHook(() => useDepartmentModuleCapabilities());

    expect(result.current.pageActions.canManageDepartments).toBe(true);
    expect(result.current.pageActions.canCreateDepartment).toBe(true);
    expect(result.current.pageActions.canViewSensitiveIdentifiers).toBe(true);
    expect(result.current.getRowPermissions({ memberCount: 0 })).toEqual({
      canOpenDrawer: true,
      canEditDepartment: true,
      canDeleteDepartment: true,
    });
    expect(result.current.getRowPermissions({ memberCount: 2 }).canDeleteDepartment).toBe(false);
  });

  it('disables the department workspace when capability is absent', () => {
    authState.role = 'manager';
    capabilityState.capabilities = {
      ...capabilityState.capabilities,
      canManageDepartments: false,
      canViewSensitiveEmployeeIdentifiers: false,
    };

    const { result } = renderHook(() => useDepartmentModuleCapabilities());

    expect(result.current.pageActions.canManageDepartments).toBe(false);
    expect(result.current.pageActions.canCreateDepartment).toBe(false);
    expect(result.current.getRowPermissions({ memberCount: 0 })).toEqual({
      canOpenDrawer: false,
      canEditDepartment: false,
      canDeleteDepartment: false,
    });
  });
});
