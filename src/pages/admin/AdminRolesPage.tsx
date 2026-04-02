import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useAdminEmployeeManagement } from '@/hooks/admin/useAdminEmployeeManagement';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import { AdminRolesLoadingSkeleton } from '@/components/admin/AdminLoadingSkeletons';
import { RolesTabSection } from '@/components/admin/RolesTabSection';
import { AdminCapabilityMatrixSection } from '@/components/admin/AdminCapabilityMatrixSection';
import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ContextChip } from '@/components/system';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { UtilityLayout } from '@/layouts/UtilityLayout';
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

  const summaryItems: SummaryRailItem[] = [
    {
      id: 'accounts',
      label: 'Accounts in scope',
      value: filteredEmployeesBySearch?.length ?? 0,
      helper: 'Employee records currently visible in role governance.',
    },
    {
      id: 'assignments',
      label: 'Role assignments',
      value: userRoles?.length ?? 0,
      helper: 'Stored role mappings available for review.',
    },
    {
      id: 'departments',
      label: 'Departments',
      value: departments?.length ?? 0,
      helper: 'Department coverage available for role oversight.',
    },
    {
      id: 'edit-mode',
      label: 'Edit mode',
      value: capabilities.isAdminLimitedProfileEditor ? 'Limited' : 'Full',
      helper: capabilities.isAdminLimitedProfileEditor
        ? 'Profile changes are constrained to limited admin editing.'
        : 'Role governance can perform full role-management actions.',
    },
  ];

  if (capabilitiesLoading) {
    return (
      <UtilityLayout
        eyebrow="Governance"
        title="Role Management"
        description="Assign and manage user roles with authority-tier safeguards."
        metaSlot={(
          <>
            <ContextChip tone="info">Scope: role governance</ContextChip>
            <ContextChip>Mode: role administration</ContextChip>
          </>
        )}
      >
        <AdminRolesLoadingSkeleton
          title="Loading role management"
          description="Checking role-governance capabilities and preparing the latest assignments."
        />
      </UtilityLayout>
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
    <UtilityLayout
      eyebrow="Governance"
      title="Role Management"
      description="Assign and manage user roles with authority-tier safeguards."
      metaSlot={(
        <>
          <ContextChip tone="info">Scope: role governance</ContextChip>
          <ContextChip>
            {capabilities.isAdminLimitedProfileEditor ? 'Mode: limited editor' : 'Mode: editable governance'}
          </ContextChip>
        </>
      )}
      leadSlot={(
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current workspace
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Role assignments and capability safeguards
            </h2>
            <p className="text-sm text-muted-foreground">
              Review assigned roles first, then validate the capability matrix that governs what each authority tier can do.
            </p>
          </section>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Governance caution
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Role changes take effect immediately
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the role roster to review who is impacted before changing authority, then confirm the matrix still matches your intended governance policy.
            </p>
          </div>
        </div>
      )}
      summarySlot={<SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />}
      supportingSlot={(
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Governance notes
          </p>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-medium text-foreground">Review roster before matrix</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the employee role roster when handling day-to-day access decisions. Use the capability matrix to confirm or refine broader governance policy after the target account and authority tier are clear.
            </p>
          </div>
        </section>
      )}
      supportingSurface="none"
    >
      <section className="space-y-6">

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
      </section>

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
    </UtilityLayout>
  );
}
