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
  });

  it('renders the settings workspace after capability checks complete', () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText('Company Branding')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});
