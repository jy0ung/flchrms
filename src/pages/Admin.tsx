import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Plus, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CardHeaderStandard,
  InteractionModeToggle,
  ModeRibbon,
  StatusBadge,
  getInteractionModeLabel,
  useInteractionMode,
} from '@/components/system';
import { AppRole } from '@/types/hrms';
import { Navigate } from 'react-router-dom';
import {
  ADMIN_STATS_CARD_DIMENSIONS,
  ADMIN_STATS_CARD_LABELS,
  ADMIN_STATS_DEFAULT_CARD_IDS,
  AdminStatsCards,
  type AdminStatsCardId,
  getAdminStatsDefaultLayoutState,
} from '@/components/admin/AdminStatsCards';
import { AdminTabsShell } from '@/components/admin/AdminTabsShell';
import { EmployeesTabSection } from '@/components/admin/EmployeesTabSection';
import { AdminAccountDialogs } from '@/components/admin/AdminAccountDialogs';
import { LeavePoliciesSection } from '@/components/admin/LeavePoliciesSection';
import { DepartmentsTabSection } from '@/components/admin/DepartmentsTabSection';
import { RolesTabSection } from '@/components/admin/RolesTabSection';
import { AdminDepartmentDialogs } from '@/components/admin/AdminDepartmentDialogs';
import { AdminLeaveTypeDialogs } from '@/components/admin/AdminLeaveTypeDialogs';
import { getAdminCapabilities } from '@/lib/admin-permissions';
import { AdminContextBar, AdminHeader, AdminSurfaceShell, AdminWorkspace } from '@/components/admin/AdminSurfaceShell';
import { getRoleAuthorityTier } from '@/components/admin/admin-authority';
import {
  EDITABLE_LAYOUT_COLUMNS,
  EDITABLE_LAYOUT_VERSION,
  addLayoutItem,
  mergeLayoutStateWithIds,
  removeLayoutItem,
  sortLayoutItems,
  type LayoutState,
} from '@/lib/editable-layout';
import {
  UI_PREFERENCES_CHANGED_EVENT,
  getAdminStatsEnabledCardIds,
  getAdminStatsLayoutState,
  resetAdminStatsEnabledCardIds,
  resetAdminStatsLayoutState,
  setAdminStatsEnabledCardIds,
  setAdminStatsLayoutState,
} from '@/lib/ui-preferences';

export default function Admin() {
  usePageTitle('Administration');
  const { user, role } = useAuth();
  const { mode, setMode } = useInteractionMode();
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
  const normalizedRole: AppRole = role ?? 'employee';
  const modeIsView = mode === 'view';
  const modeIsCustomize = mode === 'customize';
  const [visibleStatsCardIds, setVisibleStatsCardIds] = useState<AdminStatsCardId[]>(ADMIN_STATS_DEFAULT_CARD_IDS);
  const [statsLayoutState, setStatsLayoutState] = useState<LayoutState>(() => getAdminStatsDefaultLayoutState());

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

  const syncStatsCardsFromStorage = useCallback(() => {
    if (!user?.id) {
      setVisibleStatsCardIds(ADMIN_STATS_DEFAULT_CARD_IDS);
      setStatsLayoutState(getAdminStatsDefaultLayoutState());
      return;
    }

    const persistedVisibleCardIds = getAdminStatsEnabledCardIds(
      user.id,
      normalizedRole,
      ADMIN_STATS_DEFAULT_CARD_IDS,
      ADMIN_STATS_DEFAULT_CARD_IDS,
    ) as AdminStatsCardId[];
    const persistedLayout = getAdminStatsLayoutState(user.id, normalizedRole);
    const mergedLayout = mergeLayoutStateWithIds(
      persistedLayout,
      persistedVisibleCardIds,
      ADMIN_STATS_CARD_DIMENSIONS,
      EDITABLE_LAYOUT_COLUMNS,
    );
    const orderedItems = sortLayoutItems(mergedLayout.items);
    const orderedVisibleCardIds = orderedItems.map((item) => item.id as AdminStatsCardId);

    if (!persistedLayout) {
      // Non-breaking migration: seed deterministic x/y/w/h layout storage
      // from the current default card order.
      setAdminStatsLayoutState(user.id, normalizedRole, mergedLayout);
    }

    setVisibleStatsCardIds(orderedVisibleCardIds);
    setStatsLayoutState({
      version: EDITABLE_LAYOUT_VERSION,
      items: orderedItems,
    });
  }, [user?.id, normalizedRole]);

  useEffect(() => {
    syncStatsCardsFromStorage();
  }, [syncStatsCardsFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return;

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key.includes(`hrms.ui.admin.stats.cards.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.admin.stats.layout.${user.id}.${normalizedRole}`)
      ) {
        syncStatsCardsFromStorage();
      }
    };

    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, syncStatsCardsFromStorage as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, syncStatsCardsFromStorage as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [normalizedRole, syncStatsCardsFromStorage, user?.id]);

  const orderedVisibleStatsCardIds = useMemo(() => {
    const allowedSet = new Set(ADMIN_STATS_DEFAULT_CARD_IDS);
    const seen = new Set<AdminStatsCardId>();
    return visibleStatsCardIds.filter((cardId): cardId is AdminStatsCardId => {
      if (!allowedSet.has(cardId)) return false;
      if (seen.has(cardId)) return false;
      seen.add(cardId);
      return true;
    });
  }, [visibleStatsCardIds]);

  const hiddenStatsCardIds = useMemo(
    () => ADMIN_STATS_DEFAULT_CARD_IDS.filter((cardId) => !orderedVisibleStatsCardIds.includes(cardId)),
    [orderedVisibleStatsCardIds],
  );

  const hiddenStatsCardCount = hiddenStatsCardIds.length;

  const authorityTier = getRoleAuthorityTier(normalizedRole);
  const latestAdminChangeTimestamp = useMemo(() => {
    const timestamps = [
      ...(employees ?? []).map((employee) => employee.updated_at),
      ...(departments ?? []).map((department) => department.updated_at),
      ...(leaveTypes ?? []).map((leaveType) => leaveType.updated_at ?? leaveType.created_at),
    ]
      .filter(Boolean)
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value));

    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toLocaleDateString();
  }, [departments, employees, leaveTypes]);

  const governanceSummary = useMemo(() => ({
    manageableProfiles: employees?.filter((employee) => employee.status !== 'terminated').length ?? 0,
    managedDepartments: departments?.length ?? 0,
    activePolicies: leaveTypes?.length ?? 0,
    roleAssignments: userRoles?.length ?? 0,
  }), [departments, employees, leaveTypes, userRoles]);

  const policyHealthSummary = useMemo(() => {
    const allPolicies = leaveTypes ?? [];
    const docRequired = allPolicies.filter((policy) => policy.requires_document).length;
    const paidPolicies = allPolicies.filter((policy) => policy.is_paid).length;
    return {
      totalPolicies: allPolicies.length,
      docRequired,
      paidPolicies,
    };
  }, [leaveTypes]);

  const systemAlerts = useMemo(() => {
    const alerts: { id: string; message: string; tone: 'warning' | 'success' | 'error' }[] = [];
    const terminatedEmployees = employees?.filter((employee) => employee.status === 'terminated').length ?? 0;
    if (terminatedEmployees > 0) {
      alerts.push({
        id: 'terminated',
        message: `${terminatedEmployees} archived employee account(s) require periodic review.`,
        tone: 'warning',
      });
    }
    if (hiddenStatsCardCount > 0) {
      alerts.push({
        id: 'hidden-cards',
        message: `${hiddenStatsCardCount} admin KPI card(s) hidden in customize mode.`,
        tone: 'success',
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'healthy',
        message: 'No governance alerts detected in this scope.',
        tone: 'success',
      });
    }
    return alerts;
  }, [employees, hiddenStatsCardCount]);

  const resolvedStatsLayoutState = useMemo(
    () => mergeLayoutStateWithIds(statsLayoutState, orderedVisibleStatsCardIds, ADMIN_STATS_CARD_DIMENSIONS, EDITABLE_LAYOUT_COLUMNS),
    [orderedVisibleStatsCardIds, statsLayoutState],
  );

  const persistStatsLayoutState = useCallback((nextLayoutState: LayoutState) => {
    if (!user?.id) return;

    const allowedSet = new Set(ADMIN_STATS_DEFAULT_CARD_IDS);
    const filteredItems = sortLayoutItems(nextLayoutState.items).filter((item) =>
      allowedSet.has(item.id as AdminStatsCardId),
    );
    const compacted = {
      version: EDITABLE_LAYOUT_VERSION,
      items: filteredItems,
    } satisfies LayoutState;
    const nextVisibleCardIds = compacted.items.map((item) => item.id as AdminStatsCardId);

    setStatsLayoutState(compacted);
    setVisibleStatsCardIds(nextVisibleCardIds);
    setAdminStatsLayoutState(user.id, normalizedRole, compacted);
    setAdminStatsEnabledCardIds(user.id, normalizedRole, nextVisibleCardIds);
  }, [normalizedRole, user?.id]);

  const handleToggleStatsCard = useCallback((cardId: AdminStatsCardId, enabled: boolean) => {
    if (!enabled) {
      persistStatsLayoutState(removeLayoutItem(resolvedStatsLayoutState, cardId, EDITABLE_LAYOUT_COLUMNS));
      return;
    }

    const nextLayout = addLayoutItem(
      resolvedStatsLayoutState,
      {
        id: cardId,
        x: 0,
        y: resolvedStatsLayoutState.items.length,
        w: ADMIN_STATS_CARD_DIMENSIONS[cardId].w,
        h: ADMIN_STATS_CARD_DIMENSIONS[cardId].h,
      },
      EDITABLE_LAYOUT_COLUMNS,
    );
    persistStatsLayoutState(nextLayout);
  }, [persistStatsLayoutState, resolvedStatsLayoutState]);

  const handleResetStatsCards = useCallback(() => {
    if (!user?.id) return;

    const defaultLayout = getAdminStatsDefaultLayoutState();
    setVisibleStatsCardIds(ADMIN_STATS_DEFAULT_CARD_IDS);
    setStatsLayoutState(defaultLayout);
    resetAdminStatsEnabledCardIds(user.id, normalizedRole);
    resetAdminStatsLayoutState(user.id, normalizedRole);
  }, [normalizedRole, user?.id]);

  // Restrict access to director/admin/hr
  if (!capabilities.canAccessAdminPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AdminSurfaceShell
      header={
        <AdminHeader
          title="HR Admin Dashboard"
          subtitle="Manage employee profiles, access roles, leave policies, and system operations."
          modeControls={
            <InteractionModeToggle
              modes={['manage', 'bulk', 'customize']}
              includeView
              layout="inline"
              ariaLabel="Admin interaction mode"
              labels={{
                view: 'View',
                manage: 'Manage',
                bulk: 'Bulk',
                customize: 'Customize',
              }}
            />
          }
          actions={
            modeIsView ? null : (
              <StatusBadge
                status="info"
                labelOverride={`${getInteractionModeLabel(mode)} mode`}
                className="h-9 rounded-full px-3 text-xs"
              />
            )
          }
        />
      }
      contextBar={
        <AdminContextBar
          items={[
            {
              id: 'authority-tier',
              label: 'Authority Tier',
              value: authorityTier.label,
            },
            {
              id: 'scope',
              label: 'Scope',
              value: 'Organization governance surface',
            },
            {
              id: 'policy-version',
              label: 'Policy Baseline',
              value: 'v1 · Published',
            },
            {
              id: 'last-modified',
              label: 'Last Modified',
              value: latestAdminChangeTimestamp ? `${latestAdminChangeTimestamp} · System` : 'No updates yet',
            },
          ]}
        />
      }
    >
      <AdminWorkspace>
        {modeIsCustomize ? (
          <ModeRibbon
            variant="compact"
            hideDescription
            actions={(
              <>
                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                  {hiddenStatsCardCount} hidden
                </Badge>
                {hiddenStatsCardIds.map((cardId) => (
                  <Button
                    key={cardId}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg px-2.5 text-xs"
                    onClick={() => handleToggleStatsCard(cardId, true)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {ADMIN_STATS_CARD_LABELS[cardId]}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs"
                  onClick={handleResetStatsCards}
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reset Stats Cards
                </Button>
              </>
            )}
          />
        ) : null}

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
              viewerRole={normalizedRole}
              userRoles={userRoles}
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

        <section role="region" aria-label="Admin overview insights" className="space-y-3">
          {orderedVisibleStatsCardIds.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardHeaderStandard
                title="No Admin KPI Cards Visible"
                description="Enable customize mode to restore hidden cards or reset admin defaults."
                className="p-4 pb-2 sm:p-5 sm:pb-2"
                titleClassName="text-base"
              />
              <CardContent className="pt-0 pb-6 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col justify-center gap-2 sm:flex-row">
                  <Button type="button" className="rounded-lg" onClick={() => setMode('customize')}>
                    Customize Cards
                  </Button>
                  <Button type="button" variant="outline" className="rounded-lg" onClick={handleResetStatsCards}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AdminStatsCards
              density="compact"
              stats={stats}
              mode={mode}
              visibleCardIds={orderedVisibleStatsCardIds}
              layoutState={resolvedStatsLayoutState}
              onLayoutStateChange={persistStatsLayoutState}
              onHideCard={(cardId) => handleToggleStatsCard(cardId, false)}
            />
          )}

          <Card className="border-border shadow-sm">
            <CardHeaderStandard
              title="Admin Overview"
              description="Secondary governance insights for operational monitoring."
              className="p-4 pb-2 sm:p-5 sm:pb-2"
              titleClassName="text-base"
            />
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Governance Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Profiles in scope</span>
                      <span className="font-medium">{governanceSummary.manageableProfiles}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Departments</span>
                      <span className="font-medium">{governanceSummary.managedDepartments}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Role assignments</span>
                      <span className="font-medium">{governanceSummary.roleAssignments}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Policy Health Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Published policies</span>
                      <span className="font-medium">{policyHealthSummary.totalPolicies}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Document required</span>
                      <span className="font-medium">{policyHealthSummary.docRequired}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Paid policies</span>
                      <span className="font-medium">{policyHealthSummary.paidPolicies}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">System Alerts</h3>
                  <div className="space-y-2 text-sm">
                    {systemAlerts.map((alert) => (
                      <div key={alert.id} className="rounded-lg border border-border bg-muted/50 px-3 py-2">
                        <StatusBadge status={alert.tone} labelOverride={alert.tone} className="mb-1 text-[11px]" />
                        <p>{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

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
          currentAssignedRole={selectedEmployee ? getUserRole(selectedEmployee.id) : 'employee'}
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
      </AdminWorkspace>
    </AdminSurfaceShell>
  );
}
