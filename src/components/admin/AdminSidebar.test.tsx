import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import type { AdminCapabilityMap } from '@/lib/admin-capabilities';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { first_name: 'Ada', last_name: 'Admin' },
    role: 'admin',
  }),
}));

vi.mock('@/contexts/BrandingContext', () => ({
  useBrandingContext: () => ({
    branding: {
      company_name: 'FLCHRMS',
      logo_url: null,
    },
  }),
}));

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  SidebarGroupContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SidebarHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: ReactNode }) => <nav>{children}</nav>,
  SidebarMenuButton: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarRail: () => null,
  SidebarSeparator: () => <hr />,
}));

const allCapabilities: AdminCapabilityMap = {
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
};

describe('AdminSidebar', () => {
  it('removes employee and department CRUD links from the admin sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminSidebar capabilityMap={allCapabilities} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Leave Policies')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.queryByText('Employees')).not.toBeInTheDocument();
    expect(screen.queryByText('Departments')).not.toBeInTheDocument();
  });
});
