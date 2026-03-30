import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { AppSidebar } from '@/components/layout/AppSidebar';

let mockIsMobile = false;
let mockRole = 'admin';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    role: mockRole,
  }),
}));

vi.mock('@/contexts/BrandingContext', () => ({
  useBrandingContext: () => ({
    branding: {
      company_name: 'FLCHRMS',
      company_tagline: 'People Operations',
      logo_url: null,
    },
  }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useMyAdminCapabilities: () => ({
    capabilityMap: {
      access_admin_console: true,
      manage_departments: true,
    },
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/components/layout/ShellNotificationsProvider', () => ({
  useShellNotifications: () => ({
    unreadCount: 4,
  }),
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    mockIsMobile = false;
    mockRole = 'admin';
  });

  it('uses task-oriented group labels for the primary navigation', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppSidebar collapsed={false} onToggle={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Governance', { selector: 'p' })).toBeInTheDocument();

    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
    expect(screen.queryByText('Organization')).not.toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
    expect(screen.queryByText('System')).not.toBeInTheDocument();
  });

  it('provides an accessible title and description for the mobile navigation sheet', () => {
    mockIsMobile = true;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppSidebar collapsed={false} onToggle={vi.fn()} mobileOpen onMobileOpenChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('More navigation')).toBeInTheDocument();
    expect(
      screen.getByText('Browse additional workspaces, records, and governance routes not pinned to the bottom bar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pinned to bottom bar')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('w-[88vw]', 'max-w-sm');
  });

  it('uses the mobile sheet for secondary routes instead of duplicating pinned employee destinations', () => {
    mockIsMobile = true;
    mockRole = 'employee';

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppSidebar collapsed={false} onToggle={vi.fn()} mobileOpen onMobileOpenChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Leave')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Payroll' })).toBeInTheDocument();
  });
});
