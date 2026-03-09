import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useAdminEmployeeManagement } from '@/hooks/admin/useAdminEmployeeManagement';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import { RolesTabSection } from '@/components/admin/RolesTabSection';
import { AdminCapabilityMatrixSection } from '@/components/admin/AdminCapabilityMatrixSection';
import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { PageHeader, RouteLoadingState } from '@/components/system';
import { AppRole } from '@/types/hrms';

export default function AdminRolesPage() {
  usePageTitle('Admin · Roles');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
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

  if (capabilitiesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Role Management"
          description="Assign and manage user roles with authority-tier safeguards."
        />
        <RouteLoadingState
          title="Loading role management"
          description="Checking role-governance capabilities and preparing the latest assignments."
        />
      </div>
    );
  }

  if (!capabilities.canManageRoles) {
    return (
      <AdminAccessDenied
        title="Role management is disabled"
        description="Your account does not have role-governance capability."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Management"
        description="Assign and manage user roles with authority-tier safeguards."
      />

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

      <AdminCapabilityMatrixSection />

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
