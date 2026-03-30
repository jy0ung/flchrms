import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminLeavePoliciesPage from '@/pages/admin/AdminLeavePoliciesPage';

let mockCapabilityLoading = false;
let mockCanManageLeaveTypes = true;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    role: 'admin',
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useDepartments: () => ({
    data: [{ id: 'dept-1' }, { id: 'dept-2' }, { id: 'dept-3' }],
  }),
}));

vi.mock('@/hooks/useLeaveTypes', () => ({
  useLeaveTypes: () => ({
    data: [{ id: 'leave-1' }, { id: 'leave-2' }, { id: 'leave-3' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canManageLeaveTypes: mockCanManageLeaveTypes,
    },
    isLoading: mockCapabilityLoading,
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

vi.mock('@/components/admin/LeavePoliciesSection', () => ({
  LeavePoliciesSection: () => <div>Mock leave policies section</div>,
}));

vi.mock('@/components/admin/AdminLeaveTypeDialogs', () => ({
  AdminLeaveTypeDialogs: () => null,
}));

describe('AdminLeavePoliciesPage', () => {
  it('renders the governance workspace selector before content and keeps summary metrics secondary', () => {
    mockCapabilityLoading = false;
    mockCanManageLeaveTypes = true;

    render(<AdminLeavePoliciesPage />);

    const workspaceHeading = screen.getByRole('heading', { name: 'Policy workspaces', level: 2 });
    const content = screen.getByText('Mock leave policies section');
    const summary = screen.getByText('Published leave types');

    expect(workspaceHeading).toBeInTheDocument();
    expect(
      workspaceHeading.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      content.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('Published leave types')).toBeInTheDocument();
    expect(screen.getByText('Department scopes')).toBeInTheDocument();
    expect(screen.getByText('Access mode')).toBeInTheDocument();
    expect(screen.getByText('Current workspace')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Leave Types/i })).toBeInTheDocument();
    expect(screen.getByText('Editable workspace')).toBeInTheDocument();
    expect(screen.getByText('Mock leave policies section')).toBeInTheDocument();
  });

  it('renders an explicit loading state while leave-policy capabilities are resolving', () => {
    mockCapabilityLoading = true;

    render(<AdminLeavePoliciesPage />);

    expect(screen.getByText('Loading leave policies')).toBeInTheDocument();
    expect(screen.getByText('Policy workspaces')).toBeInTheDocument();
    expect(screen.getByText('Current workspace')).toBeInTheDocument();
  });
});
