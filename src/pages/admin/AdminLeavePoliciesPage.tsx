import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDepartments } from '@/hooks/useEmployees';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useAdminLeaveTypeManagement } from '@/hooks/admin/useAdminLeaveTypeManagement';
import { LeavePoliciesSection } from '@/components/admin/LeavePoliciesSection';
import { AdminLeaveTypeDialogs } from '@/components/admin/AdminLeaveTypeDialogs';
import { PageHeader, RouteLoadingState } from '@/components/system';

export default function AdminLeavePoliciesPage() {
  usePageTitle('Admin · Leave Policies');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { data: departments } = useDepartments();
  const { data: leaveTypes, isLoading: leaveTypesLoading } = useLeaveTypes();

  const {
    editLeaveTypeDialogOpen, setEditLeaveTypeDialogOpen,
    createLeaveTypeDialogOpen, setCreateLeaveTypeDialogOpen,
    deleteLeaveTypeDialogOpen, setDeleteLeaveTypeDialogOpen,
    selectedLeaveType, leaveTypeForm, setLeaveTypeForm,
    handleEditLeaveType, handleCreateLeaveType,
    handleSaveNewLeaveType, handleSaveLeaveType, handleDeleteLeaveType,
    openDeleteLeaveTypeDialog,
    updateLeaveTypePending, createLeaveTypePending, deleteLeaveTypePending,
  } = useAdminLeaveTypeManagement();

  if (capabilitiesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Leave Policies"
          description="Configure leave types, approval workflows, analytics simulations, and balance adjustments."
        />
        <RouteLoadingState
          title="Loading leave policies"
          description="Checking leave-policy capabilities and preparing the latest policy data."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Policies"
        description={
          capabilities.canManageLeaveTypes
            ? 'Configure leave types, approval workflows, notification rules, policy analytics simulations, and balance adjustments.'
            : 'Read-only leave policy and balance adjustment visibility. Editing requires leave-policy management capability.'
        }
      />

      <LeavePoliciesSection
        leaveTypes={leaveTypes}
        leaveTypesLoading={leaveTypesLoading}
        canManageLeaveTypes={capabilities.canManageLeaveTypes}
        departments={departments}
        onCreateLeaveType={handleCreateLeaveType}
        onEditLeaveType={handleEditLeaveType}
        onDeleteLeaveType={openDeleteLeaveTypeDialog}
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
