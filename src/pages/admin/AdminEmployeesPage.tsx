import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminEmployeeManagement } from '@/hooks/admin/useAdminEmployeeManagement';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import { EmployeesTabSection } from '@/components/admin/EmployeesTabSection';
import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import { CreateEmployeeDialog } from '@/components/admin/CreateEmployeeDialog';
import { getAdminCapabilities } from '@/lib/admin-permissions';
import { AppRole } from '@/types/hrms';

export default function AdminEmployeesPage() {
  usePageTitle('Admin · Employees');
  const { user, role } = useAuth();
  const capabilities = getAdminCapabilities(role);
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles } = useUserRoles();

  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false);
  const {
    search, setSearch, statusFilter, setStatusFilter,
    departmentFilter, setDepartmentFilter,
    filteredEmployees, getUserRole, roleColors,
  } = useAdminPageViewModel({ role, employees, departments, userRoles });

  const {
    canManageEmployeeProfiles, canCreateEmployee,
    canOpenAccountProfileEditor, canResetEmployeePasswords,
    isAdminLimitedProfileEditor, canViewSensitiveEmployeeIdentifiers,
  } = capabilities;

  const {
    selectedEmployee, selectedRole, setSelectedRole,
    editProfileDialogOpen, setEditProfileDialogOpen,
    editRoleDialogOpen, setEditRoleDialogOpen,
    resetPasswordDialogOpen, closeResetPasswordDialog,
    createEmployeeDialogOpen, setCreateEmployeeDialogOpen,
    createEmployeeForm, setCreateEmployeeForm,
    editForm, setEditForm,
    resetPasswordForm, setResetPasswordForm,
    handleEditProfile, handleEditRole,
    openResetPasswordDialog, openCreateEmployeeDialog,
    handleCreateEmployee, handleSaveProfile,
    handleResetUserPassword, handleSaveRole, handleDeleteRole,
    handleArchiveEmployee, handleRestoreEmployee,
    updateProfilePending, createEmployeePending,
    adminResetUserPasswordPending, updateUserRolePending, deleteUserRolePending,
  } = useAdminEmployeeManagement({ getUserRole, isAdminLimitedProfileEditor });

  const handleExportEmployees = useCallback(() => {
    const data = filteredEmployees ?? employees ?? [];
    if (data.length === 0) return;

    const headers = ['employee_id', 'first_name', 'last_name', 'email', 'username', 'phone', 'job_title', 'department', 'status', 'hire_date', 'manager'];
    const managerLookup = new Map(
      (employees ?? []).map((emp) => [emp.id, `${emp.first_name} ${emp.last_name}`]),
    );
    const csvRows = data.map((emp) => [
      emp.employee_id ?? '', emp.first_name, emp.last_name, emp.email,
      emp.username, emp.phone ?? '', emp.job_title ?? '',
      emp.department?.name ?? '', emp.status, emp.hire_date ?? '',
      emp.manager_id ? (managerLookup.get(emp.manager_id) ?? emp.manager_id) : '',
    ]);
    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) => row.map(escape).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employees_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [employees, filteredEmployees]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employee Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage employee profiles, access credentials, and organizational records.
        </p>
      </div>

      <EmployeesTabSection
        employees={employees}
        filteredEmployees={filteredEmployees}
        departments={departments}
        employeesLoading={employeesLoading}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        roleColors={roleColors}
        getUserRole={getUserRole}
        canManageEmployeeProfiles={canManageEmployeeProfiles}
        canCreateEmployee={canCreateEmployee}
        canOpenAccountProfileEditor={canOpenAccountProfileEditor}
        canResetEmployeePasswords={canResetEmployeePasswords}
        isAdminLimitedProfileEditor={isAdminLimitedProfileEditor}
        canViewSensitiveEmployeeIdentifiers={canViewSensitiveEmployeeIdentifiers}
        updateProfilePending={updateProfilePending}
        resetPasswordPending={adminResetUserPasswordPending}
        onEditProfile={handleEditProfile}
        onResetPassword={openResetPasswordDialog}
        onArchiveEmployee={handleArchiveEmployee}
        onRestoreEmployee={handleRestoreEmployee}
        onCreateEmployee={openCreateEmployeeDialog}
        onExportEmployees={handleExportEmployees}
        batchUpdateDialogOpen={batchUpdateDialogOpen}
        onBatchUpdateDialogOpenChange={setBatchUpdateDialogOpen}
      />

      <AdminAccountDialogs
        selectedEmployee={selectedEmployee}
        departments={departments}
        employees={employees}
        isAdminLimitedProfileEditor={isAdminLimitedProfileEditor}
        editProfileDialogOpen={editProfileDialogOpen}
        onEditProfileDialogOpenChange={setEditProfileDialogOpen}
        editForm={editForm}
        onEditFormChange={setEditForm}
        onSaveProfile={handleSaveProfile}
        saveProfilePending={updateProfilePending}
        resetPasswordDialogOpen={resetPasswordDialogOpen}
        onResetPasswordDialogOpenChange={closeResetPasswordDialog}
        resetPasswordForm={resetPasswordForm}
        onResetPasswordFormChange={setResetPasswordForm}
        onResetUserPassword={handleResetUserPassword}
        resetPasswordPending={adminResetUserPasswordPending}
        editRoleDialogOpen={editRoleDialogOpen}
        onEditRoleDialogOpenChange={setEditRoleDialogOpen}
        currentAssignedRole={selectedEmployee ? getUserRole(selectedEmployee.id) : 'employee'}
        selectedRole={selectedRole}
        onSelectedRoleChange={(nextRole) => setSelectedRole(nextRole)}
        onSaveRole={handleSaveRole}
        onDeleteRole={handleDeleteRole}
        updateRolePending={updateUserRolePending}
        deleteRolePending={deleteUserRolePending}
      />

      <CreateEmployeeDialog
        open={createEmployeeDialogOpen}
        onOpenChange={setCreateEmployeeDialogOpen}
        form={createEmployeeForm}
        onFormChange={setCreateEmployeeForm}
        onSubmit={handleCreateEmployee}
        isPending={createEmployeePending}
        departments={departments}
        employees={employees}
      />
    </div>
  );
}
