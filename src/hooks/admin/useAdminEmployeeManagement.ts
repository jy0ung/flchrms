import { useState } from 'react';
import { toast } from 'sonner';
import {
  useAdminResetUserPassword,
  useCreateEmployee,
  useUpdateProfile,
} from '@/hooks/useEmployees';
import { useDeleteUserRole, useUpdateUserRole } from '@/hooks/useUserRoles';
import type { AppRole, EmployeeStatus, Profile } from '@/types/hrms';
import type { AdminCreateEmployeeForm, AdminEditProfileForm, AdminResetPasswordForm } from '@/components/admin/admin-form-types';

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

interface UseAdminEmployeeManagementParams {
  getUserRole: (userId: string) => AppRole;
  isAdminLimitedProfileEditor: boolean;
}

export function useAdminEmployeeManagement({
  getUserRole,
  isAdminLimitedProfileEditor,
}: UseAdminEmployeeManagementParams) {
  const updateProfile = useUpdateProfile();
  const createEmployee = useCreateEmployee();
  const adminResetUserPassword = useAdminResetUserPassword();
  const updateUserRole = useUpdateUserRole();
  const deleteUserRole = useDeleteUserRole();

  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
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

  const handleEditProfile = (employee: Profile) => {
    setSelectedEmployee(employee);
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
    setSelectedEmployee(employee);
    setSelectedRole(getUserRole(employee.id));
    setEditRoleDialogOpen(true);
  };

  const openResetPasswordDialog = (employee: Profile) => {
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
    if (!selectedEmployee) return;

    const trimmedUsername = editForm.username.trim();
    const normalizedUsername = normalizeUsernameAlias(trimmedUsername);

    if (trimmedUsername && !normalizedUsername) {
      toast.error('Username alias is invalid. Use letters, numbers, dot, underscore, or dash.');
      return;
    }

    if (normalizedUsername && RESERVED_USERNAMES.has(normalizedUsername)) {
      toast.error(`"${normalizedUsername}" is reserved. Please choose a different username alias.`);
      return;
    }

    if (isAdminLimitedProfileEditor) {
      await updateProfile.mutateAsync({
        id: selectedEmployee.id,
        updates: {
          username: trimmedUsername || null,
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
        username: trimmedUsername || null,
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

  const handleSaveRole = async () => {
    if (!selectedEmployee) return;

    await updateUserRole.mutateAsync({
      userId: selectedEmployee.id,
      newRole: selectedRole,
    });
    setEditRoleDialogOpen(false);
  };

  const handleDeleteRole = async () => {
    if (!selectedEmployee) return;

    await deleteUserRole.mutateAsync({ userId: selectedEmployee.id });
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
    await updateProfile.mutateAsync({
      id: employee.id,
      updates: { status: 'terminated' },
    });
  };

  const handleRestoreEmployee = async (employee: Profile) => {
    await updateProfile.mutateAsync({
      id: employee.id,
      updates: { status: 'active' },
    });
  };

  return {
    selectedEmployee,
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
