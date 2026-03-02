import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminDepartmentManagement } from '@/hooks/admin/useAdminDepartmentManagement';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import { DepartmentsTabSection } from '@/components/admin/DepartmentsTabSection';
import { AdminDepartmentDialogs } from '@/components/admin/AdminDepartmentDialogs';
import { getAdminCapabilities } from '@/lib/admin-permissions';

export default function AdminDepartmentsPage() {
  usePageTitle('Admin · Departments');
  const { role } = useAuth();
  const capabilities = getAdminCapabilities(role);
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles } = useUserRoles();

  const {
    departmentSearch, setDepartmentSearch, filteredDepartments,
  } = useAdminPageViewModel({ role, employees, departments, userRoles });

  const {
    createDeptDialogOpen, setCreateDeptDialogOpen,
    editDepartmentDialogOpen, setEditDepartmentDialogOpen,
    deleteDepartmentDialogOpen, setDeleteDepartmentDialogOpen,
    newDeptName, setNewDeptName, newDeptDescription, setNewDeptDescription,
    selectedDepartment, departmentForm, setDepartmentForm,
    handleCreateDepartment, handleEditDepartment, handleSaveDepartment,
    openDeleteDepartmentDialog, handleDeleteDepartment,
    createDepartmentPending, updateDepartmentPending, deleteDepartmentPending,
  } = useAdminDepartmentManagement();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Department Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, edit, and organize departments across the organization.
        </p>
      </div>

      <DepartmentsTabSection
        departments={departments}
        filteredDepartments={filteredDepartments}
        employees={employees}
        departmentSearch={departmentSearch}
        onDepartmentSearchChange={setDepartmentSearch}
        canManageDepartments={capabilities.canManageDepartments}
        onOpenCreateDepartment={() => setCreateDeptDialogOpen(true)}
        onEditDepartment={handleEditDepartment}
        onDeleteDepartment={openDeleteDepartmentDialog}
        deleteDepartmentPending={deleteDepartmentPending}
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
    </div>
  );
}
