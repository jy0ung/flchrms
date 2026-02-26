import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useEmployees,
  useDepartments,
} from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useAdminEmployeeManagement } from '@/hooks/admin/useAdminEmployeeManagement';
import { useAdminDepartmentManagement } from '@/hooks/admin/useAdminDepartmentManagement';
import { useAdminLeaveTypeManagement } from '@/hooks/admin/useAdminLeaveTypeManagement';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import { TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/system';
import { AppRole } from '@/types/hrms';
import { Navigate } from 'react-router-dom';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminTabsShell } from '@/components/admin/AdminTabsShell';
import { EmployeesTabSection } from '@/components/admin/EmployeesTabSection';
import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import { LeavePoliciesSection } from '@/components/admin/LeavePoliciesSection';
import { DepartmentsTabSection } from '@/components/admin/DepartmentsTabSection';
import { RolesTabSection } from '@/components/admin/RolesTabSection';
import { AdminDepartmentDialogs } from '@/components/admin/AdminDepartmentDialogs';
import { AdminLeaveTypeDialogs } from '@/components/admin/AdminLeaveTypeDialogs';
import { getAdminCapabilities } from '@/lib/admin-permissions';

export default function Admin() {
  const { role } = useAuth();
  const capabilities = getAdminCapabilities(role);
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles();
  const { data: leaveTypes, isLoading: leaveTypesLoading } = useLeaveTypes();

  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false);
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    departmentSearch,
    setDepartmentSearch,
    filteredEmployeesBySearch,
    filteredEmployees,
    filteredDepartments,
    getUserRole,
    roleColors,
    stats,
    defaultAdminTab,
  } = useAdminPageViewModel({
    role,
    employees,
    departments,
    userRoles,
  });

  const {
    canManageEmployeeProfiles,
    canManageDepartments,
    canManageLeaveTypes,
    canManageRoles,
    canResetEmployeePasswords,
    canOpenAccountProfileEditor,
    isAdminLimitedProfileEditor,
    canViewSensitiveEmployeeIdentifiers,
  } = capabilities;

  const {
    selectedEmployee,
    selectedRole,
    setSelectedRole,
    editProfileDialogOpen,
    setEditProfileDialogOpen,
    editRoleDialogOpen,
    setEditRoleDialogOpen,
    resetPasswordDialogOpen,
    closeResetPasswordDialog,
    editForm,
    setEditForm,
    resetPasswordForm,
    setResetPasswordForm,
    handleEditProfile,
    handleEditRole,
    openResetPasswordDialog,
    handleSaveProfile,
    handleResetUserPassword,
    handleSaveRole,
    handleDeleteRole,
    handleArchiveEmployee,
    handleRestoreEmployee,
    updateProfilePending,
    adminResetUserPasswordPending,
    updateUserRolePending,
    deleteUserRolePending,
  } = useAdminEmployeeManagement({
    getUserRole,
    isAdminLimitedProfileEditor,
  });

  const {
    createDeptDialogOpen,
    setCreateDeptDialogOpen,
    editDepartmentDialogOpen,
    setEditDepartmentDialogOpen,
    deleteDepartmentDialogOpen,
    setDeleteDepartmentDialogOpen,
    newDeptName,
    setNewDeptName,
    newDeptDescription,
    setNewDeptDescription,
    selectedDepartment,
    departmentForm,
    setDepartmentForm,
    handleCreateDepartment,
    handleEditDepartment,
    handleSaveDepartment,
    openDeleteDepartmentDialog,
    handleDeleteDepartment,
    createDepartmentPending,
    updateDepartmentPending,
    deleteDepartmentPending,
  } = useAdminDepartmentManagement();

  const {
    editLeaveTypeDialogOpen,
    setEditLeaveTypeDialogOpen,
    createLeaveTypeDialogOpen,
    setCreateLeaveTypeDialogOpen,
    deleteLeaveTypeDialogOpen,
    setDeleteLeaveTypeDialogOpen,
    selectedLeaveType,
    leaveTypeForm,
    setLeaveTypeForm,
    handleEditLeaveType,
    handleCreateLeaveType,
    handleSaveNewLeaveType,
    handleSaveLeaveType,
    handleDeleteLeaveType,
    openDeleteLeaveTypeDialog,
    updateLeaveTypePending,
    createLeaveTypePending,
    deleteLeaveTypePending,
  } = useAdminLeaveTypeManagement();

  // Restrict access to director/admin/hr
  if (!capabilities.canAccessAdminPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Admin Dashboard"
        description="Manage employee profiles, access roles, leave policies, and system operations."
        chipsSlot={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[11px] font-medium text-foreground">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Admin Surface
          </span>
        }
      />
      <AdminStatsCards stats={stats} />

      <AdminTabsShell defaultValue={defaultAdminTab}>

        <TabsContent value="employees" className="space-y-4">
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
            batchUpdateDialogOpen={batchUpdateDialogOpen}
            onBatchUpdateDialogOpenChange={setBatchUpdateDialogOpen}
          />
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <DepartmentsTabSection
            departments={departments}
            filteredDepartments={filteredDepartments}
            employees={employees}
            departmentSearch={departmentSearch}
            onDepartmentSearchChange={setDepartmentSearch}
            canManageDepartments={canManageDepartments}
            onOpenCreateDepartment={() => setCreateDeptDialogOpen(true)}
            onEditDepartment={handleEditDepartment}
            onDeleteDepartment={openDeleteDepartmentDialog}
            deleteDepartmentPending={deleteDepartmentPending}
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RolesTabSection
            rolesLoading={rolesLoading}
            employees={filteredEmployeesBySearch}
            getUserRole={getUserRole}
            roleColors={roleColors}
            canManageRoles={canManageRoles}
            onEditRole={handleEditRole}
          />
        </TabsContent>

        {/* Leave Policies Tab */}
        <TabsContent value="leave-policies" className="space-y-4">
          <LeavePoliciesSection
            leaveTypes={leaveTypes}
            leaveTypesLoading={leaveTypesLoading}
            canManageLeaveTypes={canManageLeaveTypes}
            departments={departments}
            onCreateLeaveType={handleCreateLeaveType}
            onEditLeaveType={handleEditLeaveType}
            onDeleteLeaveType={openDeleteLeaveTypeDialog}
          />
        </TabsContent>
      </AdminTabsShell>

      <AdminAccountDialogs
        selectedEmployee={selectedEmployee}
        departments={departments}
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
        selectedRole={selectedRole}
        onSelectedRoleChange={(nextRole) => setSelectedRole(nextRole)}
        onSaveRole={handleSaveRole}
        onDeleteRole={handleDeleteRole}
        updateRolePending={updateUserRolePending}
        deleteRolePending={deleteUserRolePending}
      />

      <AdminDepartmentDialogs
        createDepartmentDialogOpen={createDeptDialogOpen}
        onCreateDepartmentDialogOpenChange={setCreateDeptDialogOpen}
        newDepartmentName={newDeptName}
        onNewDepartmentNameChange={setNewDeptName}
        newDepartmentDescription={newDeptDescription}
        onNewDepartmentDescriptionChange={setNewDeptDescription}
        onCreateDepartment={handleCreateDepartment}
        createDepartmentPending={createDepartmentPending}
        editDepartmentDialogOpen={editDepartmentDialogOpen}
        onEditDepartmentDialogOpenChange={setEditDepartmentDialogOpen}
        selectedDepartment={selectedDepartment}
        departmentForm={departmentForm}
        onDepartmentFormChange={setDepartmentForm}
        onSaveDepartment={handleSaveDepartment}
        updateDepartmentPending={updateDepartmentPending}
        deleteDepartmentDialogOpen={deleteDepartmentDialogOpen}
        onDeleteDepartmentDialogOpenChange={setDeleteDepartmentDialogOpen}
        onDeleteDepartment={handleDeleteDepartment}
        deleteDepartmentPending={deleteDepartmentPending}
      />

      <AdminLeaveTypeDialogs
        editLeaveTypeDialogOpen={editLeaveTypeDialogOpen}
        onEditLeaveTypeDialogOpenChange={setEditLeaveTypeDialogOpen}
        createLeaveTypeDialogOpen={createLeaveTypeDialogOpen}
        onCreateLeaveTypeDialogOpenChange={setCreateLeaveTypeDialogOpen}
        deleteLeaveTypeDialogOpen={deleteLeaveTypeDialogOpen}
        onDeleteLeaveTypeDialogOpenChange={setDeleteLeaveTypeDialogOpen}
        selectedLeaveType={selectedLeaveType}
        leaveTypeForm={leaveTypeForm}
        onLeaveTypeFormChange={setLeaveTypeForm}
        onSaveLeaveType={handleSaveLeaveType}
        onSaveNewLeaveType={handleSaveNewLeaveType}
        onDeleteLeaveType={handleDeleteLeaveType}
        updateLeaveTypePending={updateLeaveTypePending}
        createLeaveTypePending={createLeaveTypePending}
        deleteLeaveTypePending={deleteLeaveTypePending}
      />
    </div>
  );
}
