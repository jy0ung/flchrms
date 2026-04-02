import { useState } from 'react';
import { toast } from 'sonner';

import { useAdminResetUserPassword, useCreateEmployee, useUpdateProfile } from '@/hooks/useEmployees';
import { useDeleteUserRole, useUpdateUserRole } from '@/hooks/useUserRoles';
import type { AppRole, Profile } from '@/types/hrms';
import type { AdminCreateEmployeeForm, AdminEditProfileForm, AdminResetPasswordForm } from '@/components/admin/admin-form-types';

import type { EmployeeEditAccessMode, EmployeeRowActionPermissions } from '../types';

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'superadmin',
  'system',
  'support',
  'help',
  'hr',
  'owner',
  'api',
  'null',
  'undefined',
  'me',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeUsernameAlias(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
}

interface UseEmployeeManagementControllerParams {
  getUserRole: (userId: string) => AppRole;
  resolveEditAccessMode?: (employee: Profile) => EmployeeEditAccessMode;
  resolveRowPermissions?: (employee: Profile) => Pick<
    EmployeeRowActionPermissions,
    'canResetPassword' | 'canManageRole' | 'canArchiveRestore'
  >;
  isAdminLimitedProfileEditor?: boolean;
}

function resolveValidUsernameAlias(value: string) {
  const trimmedUsername = value.trim();
  const normalizedUsername = normalizeUsernameAlias(trimmedUsername);

  if (trimmedUsername && !normalizedUsername) {
    toast.error('Username alias is invalid. Use letters, numbers, dot, underscore, or dash.');
    return { valid: false as const, trimmedUsername: '' };
  }

  if (normalizedUsername && RESERVED_USERNAMES.has(normalizedUsername)) {
    toast.error(`"${normalizedUsername}" is reserved. Please choose a different username alias.`);
    return { valid: false as const, trimmedUsername: '' };
  }

  return { valid: true as const, trimmedUsername };
}

export function useEmployeeManagementController({
  getUserRole,
  resolveEditAccessMode,
  resolveRowPermissions,
  isAdminLimitedProfileEditor = false,
}: UseEmployeeManagementControllerParams) {
  const updateProfile = useUpdateProfile();
  const createEmployee = useCreateEmployee();
  const adminResetUserPassword = useAdminResetUserPassword();
  const updateUserRole = useUpdateUserRole();
  const deleteUserRole = useDeleteUserRole();

  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [selectedEmployeeEditAccessMode, setSelectedEmployeeEditAccessMode] = useState<EmployeeEditAccessMode>('full');
  const [selectedRole, setSelectedRole] = useState<AppRole>('employee');
  const [createEmployeeDialogOpen, setCreateEmployeeDialogOpen] = useState(false);
  const [createEmployeeForm, setCreateEmployeeForm] = useState<AdminCreateEmployeeForm>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    job_title: '',
    department_id: 'none',
    hire_date: '',
    manager_id: 'none',
  });
  const [editForm, setEditForm] = useState<AdminEditProfileForm>({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '',
    job_title: '',
    department_id: '',
    employee_id: '',
    status: 'active',
    hire_date: '',
    manager_id: 'none',
  });
  const [resetPasswordForm, setResetPasswordForm] = useState<AdminResetPasswordForm>({
    newPassword: '',
    confirmPassword: '',
  });

  const ensureRowPermission = (
    employee: Profile | null,
    permission: 'canResetPassword' | 'canManageRole' | 'canArchiveRestore',
    errorMessage: string,
  ) => {
    if (!employee || !resolveRowPermissions) {
      return true;
    }

    if (resolveRowPermissions(employee)[permission]) {
      return true;
    }

    toast.error(errorMessage);
    return false;
  };

  const handleEditProfile = (employee: Profile) => {
    const nextEditAccessMode = resolveEditAccessMode
      ? resolveEditAccessMode(employee)
      : isAdminLimitedProfileEditor
        ? 'alias_only'
        : 'full';

    if (nextEditAccessMode === 'none') {
      return;
    }

    setSelectedEmployee(employee);
    setSelectedEmployeeEditAccessMode(nextEditAccessMode);
    setEditForm({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      username: employee.username || '',
      phone: employee.phone || '',
      job_title: employee.job_title || '',
      department_id: employee.department_id || 'none',
      employee_id: employee.employee_id || '',
      status: employee.status || 'active',
      hire_date: employee.hire_date || '',
      manager_id: employee.manager_id || 'none',
    });
    setEditProfileDialogOpen(true);
  };

  const handleEditRole = (employee: Profile) => {
    if (!ensureRowPermission(employee, 'canManageRole', 'You do not have permission to manage employee roles.')) {
      return;
    }

    setSelectedEmployee(employee);
    setSelectedRole(getUserRole(employee.id));
    setEditRoleDialogOpen(true);
  };

  const openResetPasswordDialog = (employee: Profile) => {
    if (!ensureRowPermission(employee, 'canResetPassword', 'You do not have permission to reset passwords.')) {
      return;
    }

    setSelectedEmployee(employee);
    setResetPasswordForm({
      newPassword: '',
      confirmPassword: '',
    });
    setResetPasswordDialogOpen(true);
  };

  const closeResetPasswordDialog = (open: boolean) => {
    setResetPasswordDialogOpen(open);
    if (!open) {
      setResetPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedEmployee || selectedEmployeeEditAccessMode === 'none') return;

    if (selectedEmployeeEditAccessMode === 'manager_limited') {
      await updateProfile.mutateAsync({
        id: selectedEmployee.id,
        updates: {
          phone: editForm.phone || null,
          job_title: editForm.job_title || null,
        },
      });
      setEditProfileDialogOpen(false);
      return;
    }

    const usernameValidation = resolveValidUsernameAlias(editForm.username);
    if (!usernameValidation.valid) {
      return;
    }

    if (selectedEmployeeEditAccessMode === 'alias_only') {
      await updateProfile.mutateAsync({
        id: selectedEmployee.id,
        updates: {
          username: usernameValidation.trimmedUsername || null,
        },
      });
      setEditProfileDialogOpen(false);
      return;
    }

    await updateProfile.mutateAsync({
      id: selectedEmployee.id,
      updates: {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        username: usernameValidation.trimmedUsername || null,
        phone: editForm.phone || null,
        job_title: editForm.job_title || null,
        department_id: editForm.department_id === 'none' ? null : editForm.department_id || null,
        employee_id: editForm.employee_id || null,
        status: editForm.status,
        hire_date: editForm.hire_date || null,
        manager_id: editForm.manager_id === 'none' ? null : editForm.manager_id || null,
      },
    });
    setEditProfileDialogOpen(false);
  };

  const handleResetUserPassword = async () => {
    if (!selectedEmployee) return;

    const newPassword = resetPasswordForm.newPassword;
    const confirmPassword = resetPasswordForm.confirmPassword;

    if (newPassword.length < 6) {
      toast.error('Temporary password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    await adminResetUserPassword.mutateAsync({
      userId: selectedEmployee.id,
      newPassword,
    });

    closeResetPasswordDialog(false);
  };

  const handleSaveRole = async (reason: string) => {
    if (!selectedEmployee) return;
    if (!ensureRowPermission(selectedEmployee, 'canManageRole', 'You do not have permission to manage employee roles.')) {
      return;
    }

    await updateUserRole.mutateAsync({
      userId: selectedEmployee.id,
      newRole: selectedRole,
      reason,
    });
    setEditRoleDialogOpen(false);
  };

  const handleDeleteRole = async (reason: string) => {
    if (!selectedEmployee) return;
    if (!ensureRowPermission(selectedEmployee, 'canManageRole', 'You do not have permission to manage employee roles.')) {
      return;
    }

    await deleteUserRole.mutateAsync({ userId: selectedEmployee.id, reason });
    setEditRoleDialogOpen(false);
    setSelectedRole('employee');
  };

  const openCreateEmployeeDialog = () => {
    setCreateEmployeeForm({
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      phone: '',
      job_title: '',
      department_id: 'none',
      hire_date: '',
      manager_id: 'none',
    });
    setCreateEmployeeDialogOpen(true);
  };

  const handleCreateEmployee = async () => {
    const { email, password, confirmPassword, first_name, last_name } = createEmployeeForm;
    const trimmedEmail = email.trim();
    const trimmedFirstName = first_name.trim();
    const trimmedLastName = last_name.trim();

    if (!trimmedEmail) {
      toast.error('Email is required.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!trimmedFirstName) {
      toast.error('First name is required.');
      return;
    }

    if (password.length < 6) {
      toast.error('Temporary password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    await createEmployee.mutateAsync({
      email: trimmedEmail,
      password,
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      phone: createEmployeeForm.phone || null,
      job_title: createEmployeeForm.job_title || null,
      department_id: createEmployeeForm.department_id === 'none' ? null : createEmployeeForm.department_id || null,
      hire_date: createEmployeeForm.hire_date || null,
      manager_id: createEmployeeForm.manager_id === 'none' ? null : createEmployeeForm.manager_id || null,
    });

    setCreateEmployeeDialogOpen(false);
  };

  const handleArchiveEmployee = async (employee: Profile) => {
    if (!ensureRowPermission(employee, 'canArchiveRestore', 'You do not have permission to archive employees.')) {
      return;
    }

    await updateProfile.mutateAsync({
      id: employee.id,
      updates: { status: 'terminated' },
    });
  };

  const handleRestoreEmployee = async (employee: Profile) => {
    if (!ensureRowPermission(employee, 'canArchiveRestore', 'You do not have permission to restore employees.')) {
      return;
    }

    await updateProfile.mutateAsync({
      id: employee.id,
      updates: { status: 'active' },
    });
  };

  return {
    selectedEmployee,
    selectedEmployeeEditAccessMode,
    selectedRole,
    setSelectedRole,
    editProfileDialogOpen,
    setEditProfileDialogOpen,
    editRoleDialogOpen,
    setEditRoleDialogOpen,
    resetPasswordDialogOpen,
    closeResetPasswordDialog,
    createEmployeeDialogOpen,
    setCreateEmployeeDialogOpen,
    createEmployeeForm,
    setCreateEmployeeForm,
    editForm,
    setEditForm,
    resetPasswordForm,
    setResetPasswordForm,
    handleEditProfile,
    handleEditRole,
    openResetPasswordDialog,
    openCreateEmployeeDialog,
    handleCreateEmployee,
    handleSaveProfile,
    handleResetUserPassword,
    handleSaveRole,
    handleDeleteRole,
    handleArchiveEmployee,
    handleRestoreEmployee,
    updateProfilePending: updateProfile.isPending,
    createEmployeePending: createEmployee.isPending,
    adminResetUserPasswordPending: adminResetUserPassword.isPending,
    updateUserRolePending: updateUserRole.isPending,
    deleteUserRolePending: deleteUserRole.isPending,
  };
}
