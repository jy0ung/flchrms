import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEmployeeManagementController } from '@/modules/employees/hooks/useEmployeeManagementController';

const updateProfileMutateAsync = vi.fn();
const createEmployeeMutateAsync = vi.fn();
const resetPasswordMutateAsync = vi.fn();
const updateUserRoleMutateAsync = vi.fn();
const deleteUserRoleMutateAsync = vi.fn();
const toastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('@/hooks/useEmployees', () => ({
  useUpdateProfile: () => ({ mutateAsync: updateProfileMutateAsync, isPending: false }),
  useCreateEmployee: () => ({ mutateAsync: createEmployeeMutateAsync, isPending: false }),
  useAdminResetUserPassword: () => ({ mutateAsync: resetPasswordMutateAsync, isPending: false }),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useUpdateUserRole: () => ({ mutateAsync: updateUserRoleMutateAsync, isPending: false }),
  useDeleteUserRole: () => ({ mutateAsync: deleteUserRoleMutateAsync, isPending: false }),
}));

const employee = {
  id: 'emp-1',
  employee_id: 'EMP-001',
  email: 'employee@flchrms.test',
  username: 'admin',
  first_name: 'Taylor',
  last_name: 'Ng',
  phone: '+6012345678',
  avatar_url: null,
  department_id: 'dept-1',
  job_title: 'Supervisor',
  hire_date: '2025-01-10',
  manager_id: 'mgr-1',
  status: 'active' as const,
  created_at: '2025-01-10T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
};

describe('useEmployeeManagementController', () => {
  beforeEach(() => {
    updateProfileMutateAsync.mockReset().mockResolvedValue(undefined);
    createEmployeeMutateAsync.mockReset().mockResolvedValue(undefined);
    resetPasswordMutateAsync.mockReset().mockResolvedValue(undefined);
    updateUserRoleMutateAsync.mockReset().mockResolvedValue(undefined);
    deleteUserRoleMutateAsync.mockReset().mockResolvedValue(undefined);
    toastError.mockReset();
  });

  it('ignores username validation for manager-limited saves', async () => {
    const { result } = renderHook(() =>
      useEmployeeManagementController({
        getUserRole: () => 'employee',
        resolveEditAccessMode: () => 'manager_limited',
        resolveRowPermissions: () => ({
          canResetPassword: false,
          canManageRole: false,
          canArchiveRestore: false,
        }),
      }),
    );

    act(() => {
      result.current.handleEditProfile(employee);
      result.current.setEditForm({
        ...result.current.editForm,
        phone: '+6098765432',
        job_title: 'Team Lead',
      });
    });

    await act(async () => {
      await result.current.handleSaveProfile();
    });

    expect(updateProfileMutateAsync).toHaveBeenCalledWith({
      id: 'emp-1',
      updates: {
        phone: '+6098765432',
        job_title: 'Team Lead',
      },
    });
    expect(toastError).not.toHaveBeenCalledWith(expect.stringMatching(/reserved|invalid/i));
  });

  it('blocks password reset when row permissions do not allow it', () => {
    const { result } = renderHook(() =>
      useEmployeeManagementController({
        getUserRole: () => 'employee',
        resolveRowPermissions: () => ({
          canResetPassword: false,
          canManageRole: false,
          canArchiveRestore: false,
        }),
      }),
    );

    act(() => {
      result.current.openResetPasswordDialog(employee);
    });

    expect(result.current.resetPasswordDialogOpen).toBe(false);
    expect(resetPasswordMutateAsync).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('You do not have permission to reset passwords.');
  });

  it('re-checks role permissions before saving a role change', async () => {
    const { result } = renderHook(() =>
      useEmployeeManagementController({
        getUserRole: () => 'employee',
        resolveEditAccessMode: () => 'full',
        resolveRowPermissions: () => ({
          canResetPassword: false,
          canManageRole: false,
          canArchiveRestore: false,
        }),
      }),
    );

    act(() => {
      result.current.handleEditProfile(employee);
      result.current.setSelectedRole('manager');
    });

    await act(async () => {
      await result.current.handleSaveRole();
    });

    expect(updateUserRoleMutateAsync).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('You do not have permission to manage employee roles.');
  });

  it('blocks archive and restore when row permissions do not allow it', async () => {
    const { result } = renderHook(() =>
      useEmployeeManagementController({
        getUserRole: () => 'employee',
        resolveRowPermissions: () => ({
          canResetPassword: false,
          canManageRole: false,
          canArchiveRestore: false,
        }),
      }),
    );

    await act(async () => {
      await result.current.handleArchiveEmployee(employee);
      await result.current.handleRestoreEmployee(employee);
    });

    expect(updateProfileMutateAsync).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('You do not have permission to archive employees.');
    expect(toastError).toHaveBeenCalledWith('You do not have permission to restore employees.');
  });
});
