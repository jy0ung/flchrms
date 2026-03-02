import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDepartments } from '@/hooks/useEmployees';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useAdminLeaveTypeManagement } from '@/hooks/admin/useAdminLeaveTypeManagement';
import { LeavePoliciesSection } from '@/components/admin/LeavePoliciesSection';
import { AdminLeaveTypeDialogs } from '@/components/admin/AdminLeaveTypeDialogs';
import { getAdminCapabilities } from '@/lib/admin-permissions';

export default function AdminLeavePoliciesPage() {
  usePageTitle('Admin · Leave Policies');
  const { role } = useAuth();
  const capabilities = getAdminCapabilities(role);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Policies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure leave types, approval workflows, and notification rules.
        </p>
      </div>

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
