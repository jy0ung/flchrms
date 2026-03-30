import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminQuickActionsPage from '@/pages/admin/AdminQuickActionsPage';
import type { AdminCapabilityMap } from '@/lib/admin-capabilities';

let mockCapabilityLoading = false;

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
    isLoading: mockCapabilityLoading,
  }),
}));

describe('AdminQuickActionsPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
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

  it('renders canonical workspace actions as semantic links', () => {
    render(
      <MemoryRouter>
        <AdminQuickActionsPage />
      </MemoryRouter>,
    );

    const employeeCard = screen.getByRole('link', { name: /Open Employee Workspace/i });
    expect(employeeCard).toHaveAttribute('href', '/employees');
  });

  it('renders an explicit loading state while governance actions are resolving', () => {
    mockCapabilityLoading = true;

    render(
      <MemoryRouter>
        <AdminQuickActionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Governance Hub')).toBeInTheDocument();
    expect(screen.getByText('Loading governance hub')).toBeInTheDocument();
    expect(screen.getByText('Operational Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Governance Controls')).toBeInTheDocument();
  });
});
