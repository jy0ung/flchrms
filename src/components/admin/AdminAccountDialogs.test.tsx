import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import type { ComponentProps } from 'react';

function makeProps(
  overrides: Partial<ComponentProps<typeof AdminAccountDialogs>> = {},
): ComponentProps<typeof AdminAccountDialogs> {
  return {
    selectedEmployee: {
      id: 'emp-1',
      first_name: 'Grace',
      last_name: 'John',
      email: 'grace@flchrms.test',
      phone: null,
      employee_id: 'TST-EMP-001',
      username: 'grace.john',
      avatar_url: null,
      department_id: null,
      job_title: 'HR Manager',
      hire_date: null,
      manager_id: null,
      status: 'active',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      department: undefined,
      manager: undefined,
    },
    departments: [],
    isAdminLimitedProfileEditor: false,
    editProfileDialogOpen: false,
    onEditProfileDialogOpenChange: vi.fn(),
    editForm: {
      first_name: 'Grace',
      last_name: 'John',
      email: 'grace@flchrms.test',
      username: 'grace.john',
      phone: '',
      job_title: 'HR Manager',
      department_id: 'none',
      employee_id: 'TST-EMP-001',
      status: 'active',
    },
    onEditFormChange: vi.fn(),
    onSaveProfile: vi.fn(),
    saveProfilePending: false,
    resetPasswordDialogOpen: false,
    onResetPasswordDialogOpenChange: vi.fn(),
    resetPasswordForm: {
      newPassword: '',
      confirmPassword: '',
    },
    onResetPasswordFormChange: vi.fn(),
    onResetUserPassword: vi.fn(),
    resetPasswordPending: false,
    editRoleDialogOpen: true,
    onEditRoleDialogOpenChange: vi.fn(),
    currentAssignedRole: 'manager',
    selectedRole: 'general_manager',
    onSelectedRoleChange: vi.fn(),
    onSaveRole: vi.fn(),
    onDeleteRole: vi.fn(),
    updateRolePending: false,
    deleteRolePending: false,
    ...overrides,
  };
}

describe('AdminAccountDialogs role governance flow', () => {
  it('requires explicit confirmation before publishing role change', () => {
    render(<AdminAccountDialogs {...makeProps()} />);

    const publishButton = screen.getByRole('button', { name: /Publish Role Change/i });
    expect(publishButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/I confirm this role change is governance-impacting/i));
    expect(publishButton).toBeEnabled();
  });
});

