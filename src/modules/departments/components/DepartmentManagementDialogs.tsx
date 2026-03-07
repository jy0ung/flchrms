import { AdminDepartmentDialogs } from '@/components/admin/AdminDepartmentDialogs';

import type { DepartmentManagementController } from '../hooks/useDepartmentManagementController';

interface DepartmentManagementDialogsProps {
  controller: DepartmentManagementController;
}

export function DepartmentManagementDialogs({ controller }: DepartmentManagementDialogsProps) {
  return (
    <AdminDepartmentDialogs
      createDepartmentDialogOpen={controller.createDeptDialogOpen}
      onCreateDepartmentDialogOpenChange={controller.setCreateDeptDialogOpen}
      newDepartmentName={controller.newDeptName}
      onNewDepartmentNameChange={controller.setNewDeptName}
      newDepartmentDescription={controller.newDeptDescription}
      onNewDepartmentDescriptionChange={controller.setNewDeptDescription}
      onCreateDepartment={controller.handleCreateDepartment}
      createDepartmentPending={controller.createDepartmentPending}
      editDepartmentDialogOpen={controller.editDepartmentDialogOpen}
      onEditDepartmentDialogOpenChange={controller.setEditDepartmentDialogOpen}
      selectedDepartment={controller.selectedDepartment}
      departmentForm={controller.departmentForm}
      onDepartmentFormChange={controller.setDepartmentForm}
      onSaveDepartment={controller.handleSaveDepartment}
      updateDepartmentPending={controller.updateDepartmentPending}
      deleteDepartmentDialogOpen={controller.deleteDepartmentDialogOpen}
      onDeleteDepartmentDialogOpenChange={controller.setDeleteDepartmentDialogOpen}
      onDeleteDepartment={controller.handleDeleteDepartment}
      deleteDepartmentPending={controller.deleteDepartmentPending}
    />
  );
}
