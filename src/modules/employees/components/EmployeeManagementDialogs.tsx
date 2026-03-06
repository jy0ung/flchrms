import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import { BatchUpdateDialog } from '@/components/admin/BatchUpdateDialog';
import { CreateEmployeeDialog } from '@/components/admin/CreateEmployeeDialog';
import type { Department, Profile } from '@/types/hrms';

import { useEmployeeManagementController } from '../hooks/useEmployeeManagementController';

interface EmployeeManagementDialogsProps {
  controller: ReturnType<typeof useEmployeeManagementController>;
  departments?: Department[];
  employees?: (Profile & { department: Department | null })[];
  getUserRole: (userId: string) => import('@/types/hrms').AppRole;
  batchUpdateDialogOpen: boolean;
  onBatchUpdateDialogOpenChange: (open: boolean) => void;
}

export function EmployeeManagementDialogs({
  controller,
  departments,
  employees,
  getUserRole,
  batchUpdateDialogOpen,
  onBatchUpdateDialogOpenChange,
}: EmployeeManagementDialogsProps) {
  return (
    <>
      <AdminAccountDialogs
        selectedEmployee={controller.selectedEmployee}
        departments={departments}
        employees={employees}
        isAdminLimitedProfileEditor={controller.selectedEmployeeEditAccessMode === 'alias_only'}
        editAccessMode={controller.selectedEmployeeEditAccessMode}
        editProfileDialogOpen={controller.editProfileDialogOpen}
        onEditProfileDialogOpenChange={controller.setEditProfileDialogOpen}
        editForm={controller.editForm}
        onEditFormChange={controller.setEditForm}
        onSaveProfile={controller.handleSaveProfile}
        saveProfilePending={controller.updateProfilePending}
        resetPasswordDialogOpen={controller.resetPasswordDialogOpen}
        onResetPasswordDialogOpenChange={controller.closeResetPasswordDialog}
        resetPasswordForm={controller.resetPasswordForm}
        onResetPasswordFormChange={controller.setResetPasswordForm}
        onResetUserPassword={controller.handleResetUserPassword}
        resetPasswordPending={controller.adminResetUserPasswordPending}
        editRoleDialogOpen={controller.editRoleDialogOpen}
        onEditRoleDialogOpenChange={controller.setEditRoleDialogOpen}
        currentAssignedRole={controller.selectedEmployee ? getUserRole(controller.selectedEmployee.id) : 'employee'}
        selectedRole={controller.selectedRole}
        onSelectedRoleChange={controller.setSelectedRole}
        onSaveRole={controller.handleSaveRole}
        onDeleteRole={controller.handleDeleteRole}
        updateRolePending={controller.updateUserRolePending}
        deleteRolePending={controller.deleteUserRolePending}
      />

      <CreateEmployeeDialog
        open={controller.createEmployeeDialogOpen}
        onOpenChange={controller.setCreateEmployeeDialogOpen}
        form={controller.createEmployeeForm}
        onFormChange={controller.setCreateEmployeeForm}
        onSubmit={controller.handleCreateEmployee}
        isPending={controller.createEmployeePending}
        departments={departments}
        employees={employees}
      />

      <BatchUpdateDialog
        open={batchUpdateDialogOpen}
        onOpenChange={onBatchUpdateDialogOpenChange}
        employees={employees}
        departments={departments}
      />
    </>
  );
}
