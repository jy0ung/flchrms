import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

import { AppSidebar } from '@/components/layout/AppSidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    role: 'admin',
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
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useNotifications', () => ({
  useUserNotifications: () => ({
    unreadCount: 4,
  }),
}));

describe('AppSidebar', () => {
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
    expect(screen.getByText('Governance')).toBeInTheDocument();

    expect(screen.queryByText('Operations')).not.toBeInTheDocument();
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
    expect(screen.queryByText('Organization')).not.toBeInTheDocument();
    expect(screen.queryByText('Development')).not.toBeInTheDocument();
    expect(screen.queryByText('System')).not.toBeInTheDocument();
  });
});
