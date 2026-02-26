import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalScaffold, ModalSection } from '@/components/system';
import type { Department } from '@/types/hrms';
import type { AdminDepartmentForm } from '@/components/admin/admin-form-types';

interface AdminDepartmentDialogsProps {
  createDepartmentDialogOpen: boolean;
  onCreateDepartmentDialogOpenChange: (open: boolean) => void;
  newDepartmentName: string;
  onNewDepartmentNameChange: (value: string) => void;
  newDepartmentDescription: string;
  onNewDepartmentDescriptionChange: (value: string) => void;
  onCreateDepartment: () => void;
  createDepartmentPending: boolean;
  editDepartmentDialogOpen: boolean;
  onEditDepartmentDialogOpenChange: (open: boolean) => void;
  selectedDepartment: Department | null;
  departmentForm: AdminDepartmentForm;
  onDepartmentFormChange: (next: AdminDepartmentForm) => void;
  onSaveDepartment: () => void;
  updateDepartmentPending: boolean;
  deleteDepartmentDialogOpen: boolean;
  onDeleteDepartmentDialogOpenChange: (open: boolean) => void;
  onDeleteDepartment: () => void;
  deleteDepartmentPending: boolean;
}

export function AdminDepartmentDialogs({
  createDepartmentDialogOpen,
  onCreateDepartmentDialogOpenChange,
  newDepartmentName,
  onNewDepartmentNameChange,
  newDepartmentDescription,
  onNewDepartmentDescriptionChange,
  onCreateDepartment,
  createDepartmentPending,
  editDepartmentDialogOpen,
  onEditDepartmentDialogOpenChange,
  selectedDepartment,
  departmentForm,
  onDepartmentFormChange,
  onSaveDepartment,
  updateDepartmentPending,
  deleteDepartmentDialogOpen,
  onDeleteDepartmentDialogOpenChange,
  onDeleteDepartment,
  deleteDepartmentPending,
}: AdminDepartmentDialogsProps) {
  return (
    <>
      <ModalScaffold
        open={createDepartmentDialogOpen}
        onOpenChange={onCreateDepartmentDialogOpenChange}
        title="Create New Department"
        description="Add a new department to the organization"
        maxWidth="xl"
        body={(
          <ModalSection title="Department Details">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="dept_name">Department Name</Label>
                <Input
                  id="dept_name"
                  value={newDepartmentName}
                  onChange={(e) => onNewDepartmentNameChange(e.target.value)}
                  placeholder="e.g. Engineering, Marketing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept_description">Description (Optional)</Label>
                <Input
                  id="dept_description"
                  value={newDepartmentDescription}
                  onChange={(e) => onNewDepartmentDescriptionChange(e.target.value)}
                  placeholder="Brief description of this department"
                />
              </div>
            </div>
          </ModalSection>
        )}
        footer={(
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onCreateDepartmentDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onCreateDepartment}
              disabled={!newDepartmentName.trim() || createDepartmentPending}
            >
              {createDepartmentPending ? 'Creating...' : 'Create Department'}
            </Button>
          </>
        )}
      />

      <ModalScaffold
        open={editDepartmentDialogOpen}
        onOpenChange={onEditDepartmentDialogOpenChange}
        title="Edit Department"
        description={`Update settings for ${selectedDepartment?.name ?? 'department'}`}
        maxWidth="xl"
        body={(
          <ModalSection title="Department Details">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_dept_name">Department Name</Label>
                <Input
                  id="edit_dept_name"
                  value={departmentForm.name}
                  onChange={(e) => onDepartmentFormChange({ ...departmentForm, name: e.target.value })}
                  placeholder="e.g. Engineering, Marketing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_dept_description">Description (Optional)</Label>
                <Input
                  id="edit_dept_description"
                  value={departmentForm.description}
                  onChange={(e) => onDepartmentFormChange({ ...departmentForm, description: e.target.value })}
                  placeholder="Brief description of this department"
                />
              </div>
            </div>
          </ModalSection>
        )}
        footer={(
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditDepartmentDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onSaveDepartment}
              disabled={!departmentForm.name.trim() || updateDepartmentPending}
            >
              {updateDepartmentPending ? 'Saving...' : 'Save Department'}
            </Button>
          </>
        )}
      />

      <AlertDialog open={deleteDepartmentDialogOpen} onOpenChange={onDeleteDepartmentDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"? This action cannot be undone.
              Departments with assigned employees cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteDepartment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDepartmentPending}
            >
              {deleteDepartmentPending ? 'Deleting...' : 'Delete Department'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
