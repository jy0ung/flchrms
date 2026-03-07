import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AdminEntryRedirect } from '@/components/admin/AdminEntryRedirect';
import type { AdminCapabilityMap } from '@/lib/admin-capabilities';

const buildCapabilities = (overrides: Partial<AdminCapabilityMap>): AdminCapabilityMap => ({
  access_admin_console: true,
  view_admin_dashboard: false,
  view_admin_quick_actions: false,
  view_admin_audit_log: false,
  manage_employee_directory: false,
  create_employee: false,
  reset_employee_passwords: false,
  manage_departments: false,
  manage_roles: false,
  manage_leave_policies: false,
  manage_announcements: false,
  manage_admin_settings: false,
  view_sensitive_employee_identifiers: false,
  ...overrides,
});

const mockUseMyAdminCapabilities = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useMyAdminCapabilities: () => mockUseMyAdminCapabilities(),
}));

describe('AdminEntryRedirect', () => {
  it('prefers system governance destinations before compatibility CRUD routes', () => {
    mockUseMyAdminCapabilities.mockReturnValue({
      capabilityMap: buildCapabilities({
        manage_roles: true,
        manage_employee_directory: true,
      }),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminEntryRedirect />} />
          <Route path="/admin/roles" element={<div>roles-destination</div>} />
          <Route path="/admin/employees" element={<div>employees-destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('roles-destination')).toBeInTheDocument();
    expect(screen.queryByText('employees-destination')).not.toBeInTheDocument();
  });

  it('still falls back to the employee compatibility route when no system page is available', () => {
    mockUseMyAdminCapabilities.mockReturnValue({
      capabilityMap: buildCapabilities({
        manage_employee_directory: true,
      }),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminEntryRedirect />} />
          <Route path="/admin/employees" element={<div>employees-destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('employees-destination')).toBeInTheDocument();
  });
});
