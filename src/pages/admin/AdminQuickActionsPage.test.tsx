import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminQuickActionsPage from '@/pages/admin/AdminQuickActionsPage';
import type { AdminCapabilityMap } from '@/lib/admin-capabilities';

const mockNavigate = vi.fn();

const buildCapabilities = (overrides: Partial<AdminCapabilityMap>): AdminCapabilityMap => ({
  access_admin_console: true,
  view_admin_dashboard: true,
  view_admin_quick_actions: true,
  view_admin_audit_log: true,
  manage_employee_directory: true,
  create_employee: true,
  reset_employee_passwords: true,
  manage_departments: true,
  manage_roles: true,
  manage_leave_policies: true,
  manage_announcements: true,
  manage_admin_settings: true,
  view_sensitive_employee_identifiers: true,
  ...overrides,
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: () => undefined,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilityMap: buildCapabilities({}),
    capabilities: {
      canViewAdminQuickActions: true,
    },
    isLoading: false,
  }),
}));

describe('AdminQuickActionsPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('surfaces canonical workspace links instead of direct employee and department CRUD actions', () => {
    render(
      <MemoryRouter>
        <AdminQuickActionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Open Employee Workspace')).toBeInTheDocument();
    expect(screen.getByText('Open Department Workspace')).toBeInTheDocument();
    expect(screen.getByText('Operational Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Governance Controls')).toBeInTheDocument();
    expect(screen.queryByText('Create Employee')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Department')).not.toBeInTheDocument();
    expect(screen.queryByText('Operational work now happens in canonical module workspaces')).not.toBeInTheDocument();
  });

  it('routes to the canonical employee workspace from quick actions', () => {
    render(
      <MemoryRouter>
        <AdminQuickActionsPage />
      </MemoryRouter>,
    );

    const employeeCard = screen.getByText('Open Employee Workspace').closest('.cursor-pointer');
    expect(employeeCard).not.toBeNull();

    fireEvent.click(employeeCard!);

    expect(mockNavigate).toHaveBeenCalledWith('/employees');
  });
});
