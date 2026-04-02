import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminRolesPage from '@/pages/admin/AdminRolesPage';

let mockCapabilityLoading = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canManageRoles: true,
      isAdminLimitedProfileEditor: false,
    },
    isLoading: mockCapabilityLoading,
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [{ id: 'emp-1', first_name: 'Amy', last_name: 'Admin' }],
  }),
  useDepartments: () => ({
    data: [{ id: 'dept-1', name: 'People' }],
  }),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    data: [{ id: 'role-1', user_id: 'emp-1', role: 'admin' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/admin/useAdminPageViewModel', () => ({
  useAdminPageViewModel: () => ({
    filteredEmployeesBySearch: [{ id: 'emp-1', first_name: 'Amy', last_name: 'Admin' }],
    getUserRole: () => 'admin',
    roleColors: {},
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
    editForm: {},
    setEditForm: vi.fn(),
    resetPasswordForm: {},
    setResetPasswordForm: vi.fn(),
    handleEditRole: vi.fn(),
    handleSaveProfile: vi.fn(),
    handleResetUserPassword: vi.fn(),
    handleSaveRole: vi.fn(),
    handleDeleteRole: vi.fn(),
    updateProfilePending: false,
    adminResetUserPasswordPending: false,
    updateUserRolePending: false,
    deleteUserRolePending: false,
  }),
}));

vi.mock('@/components/admin/RolesTabSection', () => ({
  RolesTabSection: () => <div>Mock roles tab section</div>,
}));

vi.mock('@/components/admin/AdminCapabilityMatrixSection', () => ({
  AdminCapabilityMatrixSection: () => <div>Mock capability matrix</div>,
}));

vi.mock('@/components/admin/AdminAccountDialogs', () => ({
  AdminAccountDialogs: () => null,
}));

describe('AdminRolesPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
  });

  it('renders a structured loading preview while role capabilities resolve', () => {
    mockCapabilityLoading = true;

    render(<AdminRolesPage />);

    expect(screen.getByText('Role Management')).toBeInTheDocument();
    expect(screen.getByText('Loading role management')).toBeInTheDocument();
    expect(screen.getByText('Role assignments')).toBeInTheDocument();
    expect(screen.getByText('Capability matrix')).toBeInTheDocument();
  });

  it('renders the role workspace with governance lead and summary context', () => {
    render(<AdminRolesPage />);

    expect(screen.getByText('Current workspace')).toBeInTheDocument();
    expect(screen.getByText('Role assignments and capability safeguards')).toBeInTheDocument();
    expect(screen.getByText('Governance notes')).toBeInTheDocument();
    expect(screen.getByText('Accounts in scope')).toBeInTheDocument();
    expect(screen.getByText('Role assignments')).toBeInTheDocument();
    expect(screen.getByText('Mock roles tab section')).toBeInTheDocument();
    expect(screen.getByText('Mock capability matrix')).toBeInTheDocument();
  });
});
