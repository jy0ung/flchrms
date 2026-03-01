import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Admin from '@/pages/Admin';
import { InteractionModeProvider } from '@/components/system';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-user-id' },
    role: 'admin',
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [
      {
        id: 'emp-1',
        updated_at: '2026-02-27T00:00:00Z',
        status: 'active',
      },
    ],
    isLoading: false,
  }),
  useDepartments: () => ({
    data: [
      {
        id: 'dept-1',
        name: 'Operations',
        description: null,
        manager_id: null,
        created_at: '2026-02-27T00:00:00Z',
        updated_at: '2026-02-27T00:00:00Z',
      },
    ],
  }),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    data: [
      {
        id: 'role-1',
        user_id: 'emp-1',
        role: 'admin',
        created_at: '2026-02-27T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useLeaveTypes', () => ({
  useLeaveTypes: () => ({
    data: [
      {
        id: 'lt-1',
        name: 'Annual Leave',
        description: null,
        days_allowed: 14,
        is_paid: true,
        min_days: 0,
        requires_document: false,
        created_at: '2026-02-27T00:00:00Z',
        updated_at: '2026-02-27T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/admin/useAdminPageViewModel', () => ({
  useAdminPageViewModel: () => ({
    search: '',
    setSearch: vi.fn(),
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    departmentFilter: 'all',
    setDepartmentFilter: vi.fn(),
    departmentSearch: '',
    setDepartmentSearch: vi.fn(),
    filteredEmployeesBySearch: [],
    filteredEmployees: [],
    filteredDepartments: [],
    getUserRole: () => 'admin',
    roleColors: {
      employee: '',
      manager: '',
      general_manager: '',
      director: '',
      hr: '',
      admin: '',
    },
    stats: {
      totalEmployees: 1,
      admins: 1,
      hrUsers: 0,
      managers: 0,
    },
    defaultAdminTab: 'employees',
  }),
}));

vi.mock('@/hooks/admin/useAdminEmployeeManagement', () => ({
  useAdminEmployeeManagement: () => ({
    selectedEmployee: null,
    selectedRole: 'employee',
    setSelectedRole: vi.fn(),
    editProfileDialogOpen: false,
    setEditProfileDialogOpen: vi.fn(),
    editRoleDialogOpen: false,
    setEditRoleDialogOpen: vi.fn(),
    resetPasswordDialogOpen: false,
    closeResetPasswordDialog: vi.fn(),
    createEmployeeDialogOpen: false,
    setCreateEmployeeDialogOpen: vi.fn(),
    createEmployeeForm: {
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      phone: '',
      job_title: '',
      department_id: 'none',
      hire_date: '',
      manager_id: 'none',
    },
    setCreateEmployeeForm: vi.fn(),
    editForm: {},
    setEditForm: vi.fn(),
    resetPasswordForm: {},
    setResetPasswordForm: vi.fn(),
    handleEditProfile: vi.fn(),
    handleEditRole: vi.fn(),
    openResetPasswordDialog: vi.fn(),
    openCreateEmployeeDialog: vi.fn(),
    handleCreateEmployee: vi.fn(),
    handleSaveProfile: vi.fn(),
    handleResetUserPassword: vi.fn(),
    handleSaveRole: vi.fn(),
    handleDeleteRole: vi.fn(),
    handleArchiveEmployee: vi.fn(),
    handleRestoreEmployee: vi.fn(),
    updateProfilePending: false,
    createEmployeePending: false,
    adminResetUserPasswordPending: false,
    updateUserRolePending: false,
    deleteUserRolePending: false,
  }),
}));

vi.mock('@/hooks/admin/useAdminDepartmentManagement', () => ({
  useAdminDepartmentManagement: () => ({
    createDeptDialogOpen: false,
    setCreateDeptDialogOpen: vi.fn(),
    editDepartmentDialogOpen: false,
    setEditDepartmentDialogOpen: vi.fn(),
    deleteDepartmentDialogOpen: false,
    setDeleteDepartmentDialogOpen: vi.fn(),
    newDeptName: '',
    setNewDeptName: vi.fn(),
    newDeptDescription: '',
    setNewDeptDescription: vi.fn(),
    selectedDepartment: null,
    departmentForm: {},
    setDepartmentForm: vi.fn(),
    handleCreateDepartment: vi.fn(),
    handleEditDepartment: vi.fn(),
    handleSaveDepartment: vi.fn(),
    openDeleteDepartmentDialog: vi.fn(),
    handleDeleteDepartment: vi.fn(),
    createDepartmentPending: false,
    updateDepartmentPending: false,
    deleteDepartmentPending: false,
  }),
}));

vi.mock('@/hooks/admin/useAdminLeaveTypeManagement', () => ({
  useAdminLeaveTypeManagement: () => ({
    editLeaveTypeDialogOpen: false,
    setEditLeaveTypeDialogOpen: vi.fn(),
    createLeaveTypeDialogOpen: false,
    setCreateLeaveTypeDialogOpen: vi.fn(),
    deleteLeaveTypeDialogOpen: false,
    setDeleteLeaveTypeDialogOpen: vi.fn(),
    selectedLeaveType: null,
    leaveTypeForm: {},
    setLeaveTypeForm: vi.fn(),
    handleEditLeaveType: vi.fn(),
    handleCreateLeaveType: vi.fn(),
    handleSaveNewLeaveType: vi.fn(),
    handleSaveLeaveType: vi.fn(),
    handleDeleteLeaveType: vi.fn(),
    openDeleteLeaveTypeDialog: vi.fn(),
    updateLeaveTypePending: false,
    createLeaveTypePending: false,
    deleteLeaveTypePending: false,
  }),
}));

vi.mock('@/components/admin/EmployeesTabSection', () => ({
  EmployeesTabSection: () => <div data-testid="employees-section">Employees section</div>,
}));

vi.mock('@/components/admin/DepartmentsTabSection', () => ({
  DepartmentsTabSection: () => <div>Departments section</div>,
}));

vi.mock('@/components/admin/RolesTabSection', () => ({
  RolesTabSection: () => <div>Roles section</div>,
}));

vi.mock('@/components/admin/LeavePoliciesSection', () => ({
  LeavePoliciesSection: () => <div>Leave policies section</div>,
}));

vi.mock('@/components/admin/AdminAccountDialogs', () => ({
  AdminAccountDialogs: () => null,
}));

vi.mock('@/components/admin/AdminDepartmentDialogs', () => ({
  AdminDepartmentDialogs: () => null,
}));

vi.mock('@/components/admin/AdminLeaveTypeDialogs', () => ({
  AdminLeaveTypeDialogs: () => null,
}));

vi.mock('@/lib/ui-preferences', () => ({
  UI_PREFERENCES_CHANGED_EVENT: 'hrms.ui.preferences.changed',
  getAdminStatsEnabledCardIds: (_userId: string, _role: string, fallback: string[]) => fallback,
  getAdminStatsLayoutState: () => null,
  resetAdminStatsEnabledCardIds: vi.fn(),
  resetAdminStatsLayoutState: vi.fn(),
  setAdminStatsEnabledCardIds: vi.fn(),
  setAdminStatsLayoutState: vi.fn(),
}));

describe('Admin page structural composition', () => {
  it('renders workspace tabs before admin overview insights section', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <InteractionModeProvider resetOnRouteChange={false}>
          <Admin />
        </InteractionModeProvider>
      </MemoryRouter>,
    );

    const contextScope = screen.getByText('Organization governance surface');
    const tabList = screen.getByRole('tablist');
    const employeesSection = screen.getByTestId('employees-section');
    const overviewSection = screen.getByRole('region', { name: /Admin overview insights/i });

    expect(contextScope.compareDocumentPosition(tabList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tabList.compareDocumentPosition(employeesSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(employeesSection.compareDocumentPosition(overviewSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
