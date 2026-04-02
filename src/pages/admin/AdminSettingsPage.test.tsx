import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

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
      canManageAdminSettings: true,
    },
    isLoading: mockCapabilityLoading,
  }),
}));

vi.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({
    data: {
      company_name: 'FL Group',
      company_tagline: 'HR Management System',
      primary_color: '221 83% 53%',
      accent_color: '142 71% 45%',
      sidebar_color: '0 0% 3%',
      logo_url: null,
      favicon_url: null,
    },
  }),
  useUpdateBranding: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUploadBrandingAsset: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
  });

  it('renders a structured loading preview while settings capabilities resolve', () => {
    mockCapabilityLoading = true;

    render(<AdminSettingsPage />);

    expect(screen.getByText('Loading system settings')).toBeInTheDocument();
    expect(screen.getByText('Company Branding')).toBeInTheDocument();
    expect(screen.getByText('General settings')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('renders the settings workspace with a current-workspace lead and governance notes', () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText('Current workspace')).toBeInTheDocument();
    expect(screen.getByText('Platform identity and default controls')).toBeInTheDocument();
    expect(screen.getByText('Governance notes')).toBeInTheDocument();
    expect(screen.getByText('Branding assets')).toBeInTheDocument();
    expect(screen.getByText('Session timeout')).toBeInTheDocument();
    expect(screen.getByText('Company Branding')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});
