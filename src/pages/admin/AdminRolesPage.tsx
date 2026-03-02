import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminEmployeeManagement } from '@/hooks/admin/useAdminEmployeeManagement';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import { RolesTabSection } from '@/components/admin/RolesTabSection';
import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import { getAdminCapabilities } from '@/lib/admin-permissions';
import { AppRole } from '@/types/hrms';

export default function AdminRolesPage() {
  usePageTitle('Admin · Roles');
  const { role } = useAuth();
  const capabilities = getAdminCapabilities(role);
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles();
  const normalizedRole: AppRole = role ?? 'employee';

  const {
    filteredEmployeesBySearch, getUserRole, roleColors,
  } = useAdminPageViewModel({ role, employees, departments, userRoles });

  const {
    selectedEmployee, selectedRole, setSelectedRole,
    editProfileDialogOpen, setEditProfileDialogOpen,
    editRoleDialogOpen, setEditRoleDialogOpen,
    resetPasswordDialogOpen, closeResetPasswordDialog,
    editForm, setEditForm,
    resetPasswordForm, setResetPasswordForm,
    handleEditRole, handleSaveProfile,
    handleResetUserPassword, handleSaveRole, handleDeleteRole,
    updateProfilePending,
    adminResetUserPasswordPending, updateUserRolePending, deleteUserRolePending,
  } = useAdminEmployeeManagement({ getUserRole, isAdminLimitedProfileEditor: capabilities.isAdminLimitedProfileEditor });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign and manage user roles with authority-tier safeguards.
        </p>
      </div>

      <RolesTabSection
        rolesLoading={rolesLoading}
        employees={filteredEmployeesBySearch}
        getUserRole={getUserRole}
        roleColors={roleColors}
        viewerRole={normalizedRole}
        userRoles={userRoles}
        canManageRoles={capabilities.canManageRoles}
        onEditRole={handleEditRole}
      />

      <AdminAccountDialogs
        selectedEmployee={selectedEmployee}
        departments={departments}
        employees={employees}
        isAdminLimitedProfileEditor={capabilities.isAdminLimitedProfileEditor}
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
    </div>
  );
}
