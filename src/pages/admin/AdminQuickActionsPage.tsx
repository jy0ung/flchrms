import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Building2,
  FileText,
  Megaphone,
  Download,
  KeyRound,
  Shield,
  Settings,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useAdminEmployeeManagement } from '@/hooks/admin/useAdminEmployeeManagement';
import { useAdminDepartmentManagement } from '@/hooks/admin/useAdminDepartmentManagement';
import { useAdminLeaveTypeManagement } from '@/hooks/admin/useAdminLeaveTypeManagement';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminCapabilityKey } from '@/lib/admin-capabilities';
import { Card, CardContent } from '@/components/ui/card';
import { CreateEmployeeDialog } from '@/components/admin/CreateEmployeeDialog';
import { AdminDepartmentDialogs } from '@/components/admin/AdminDepartmentDialogs';
import { AdminLeaveTypeDialogs } from '@/components/admin/AdminLeaveTypeDialogs';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bg: string;
  capability: AdminCapabilityKey;
  action: () => void;
}

export default function AdminQuickActionsPage() {
  usePageTitle('Admin · Quick Actions');
  const navigate = useNavigate();
  const { role } = useAuth();
  const { capabilityMap, capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles } = useUserRoles();
  const { getUserRole } = useAdminPageViewModel({ role, employees, departments, userRoles });

  const {
    createEmployeeDialogOpen, setCreateEmployeeDialogOpen,
    createEmployeeForm, setCreateEmployeeForm,
    openCreateEmployeeDialog, handleCreateEmployee,
    createEmployeePending,
  } = useAdminEmployeeManagement({ getUserRole, isAdminLimitedProfileEditor: false });

  const {
    createDeptDialogOpen, setCreateDeptDialogOpen,
    newDeptName, setNewDeptName,
    newDeptDescription, setNewDeptDescription,
    handleCreateDepartment, createDepartmentPending,
    editDepartmentDialogOpen, setEditDepartmentDialogOpen,
    deleteDepartmentDialogOpen, setDeleteDepartmentDialogOpen,
    selectedDepartment, departmentForm, setDepartmentForm,
    handleSaveDepartment, updateDepartmentPending,
    handleDeleteDepartment, deleteDepartmentPending,
  } = useAdminDepartmentManagement();

  const {
    createLeaveTypeDialogOpen, setCreateLeaveTypeDialogOpen,
    editLeaveTypeDialogOpen, setEditLeaveTypeDialogOpen,
    deleteLeaveTypeDialogOpen, setDeleteLeaveTypeDialogOpen,
    selectedLeaveType, leaveTypeForm, setLeaveTypeForm,
    handleCreateLeaveType, handleSaveNewLeaveType,
    handleSaveLeaveType, handleDeleteLeaveType,
    createLeaveTypePending, updateLeaveTypePending, deleteLeaveTypePending,
  } = useAdminLeaveTypeManagement();

  if (capabilitiesLoading) {
    return null;
  }

  if (!capabilities.canViewAdminQuickActions) {
    return (
      <AdminAccessDenied
        title="Quick actions are disabled"
        description="Your account does not have the capability to view admin quick actions."
      />
    );
  }

  const handleExportCSV = () => {
    const data = employees ?? [];
    if (data.length === 0) {
      toast.info('No employees to export');
      return;
    }
    const headers = ['employee_id', 'first_name', 'last_name', 'email', 'username', 'phone', 'job_title', 'department', 'status', 'hire_date'];
    const csvRows = data.map((emp) => [
      emp.employee_id ?? '', emp.first_name, emp.last_name, emp.email,
      emp.username, emp.phone ?? '', emp.job_title ?? '',
      emp.department?.name ?? '', emp.status, emp.hire_date ?? '',
    ]);
    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvContent = [headers.join(','), ...csvRows.map((row) => row.map(escape).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `employees_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Employee data exported');
  };

  const quickActions: QuickAction[] = [
    {
      id: 'create-employee',
      icon: UserPlus,
      title: 'Create Employee',
      description: 'Add a new employee to the system with profile and credentials.',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      capability: 'create_employee',
      action: openCreateEmployeeDialog,
    },
    {
      id: 'create-department',
      icon: Building2,
      title: 'Create Department',
      description: 'Add a new organizational department.',
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/50',
      capability: 'manage_departments',
      action: () => setCreateDeptDialogOpen(true),
    },
    {
      id: 'create-leave-type',
      icon: FileText,
      title: 'Create Leave Type',
      description: 'Define a new leave policy with entitlement and rules.',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 dark:bg-cyan-950/50',
      capability: 'manage_leave_policies',
      action: handleCreateLeaveType,
    },
    {
      id: 'post-announcement',
      icon: Megaphone,
      title: 'Post Announcement',
      description: 'Publish a company-wide announcement to all employees.',
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      capability: 'manage_announcements',
      action: () => navigate('/admin/announcements'),
    },
    {
      id: 'export-csv',
      icon: Download,
      title: 'Export Employee CSV',
      description: 'Download a CSV file of all employee records.',
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/50',
      capability: 'manage_employee_directory',
      action: handleExportCSV,
    },
    {
      id: 'manage-roles',
      icon: Shield,
      title: 'Manage Roles',
      description: 'Navigate to role assignment with authority-tier safeguards.',
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      capability: 'manage_roles',
      action: () => navigate('/admin/roles'),
    },
    {
      id: 'reset-password',
      icon: KeyRound,
      title: 'Reset Password',
      description: "Navigate to employees to reset a user's password.",
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      capability: 'reset_employee_passwords',
      action: () => navigate('/admin/employees'),
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'System Settings',
      description: 'Configure system-wide settings and preferences.',
      color: 'text-slate-600',
      bg: 'bg-slate-100 dark:bg-slate-900/50',
      capability: 'manage_admin_settings',
      action: () => navigate('/admin/settings'),
    },
  ];

  const visibleQuickActions = quickActions.filter((action) => capabilityMap[action.capability]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quick Actions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Common administrative tasks accessible in one click.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleQuickActions.map((action) => (
          <Card
            key={action.id}
            className="border-border shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.98]"
            onClick={action.action}
          >
            <CardContent className="p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg} mb-3`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <h3 className="text-sm font-semibold">{action.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {action.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateEmployeeDialog
        open={createEmployeeDialogOpen}
        onOpenChange={setCreateEmployeeDialogOpen}
        form={createEmployeeForm}
        onFormChange={setCreateEmployeeForm}
        onSubmit={handleCreateEmployee}
        isPending={createEmployeePending}
        departments={departments}
        employees={employees}
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
