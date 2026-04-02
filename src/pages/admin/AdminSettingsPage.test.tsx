import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

let mockCapabilityLoading = false;
const mockUpdateBranding = vi.fn();
const mockUpdateTenantSettings = vi.fn();

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
    mutate: mockUpdateBranding,
    isPending: false,
  }),
  useUploadBrandingAsset: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useTenantSettings', () => ({
  TENANT_SETTINGS_DEFAULTS: {
    id: 'tenant-settings-1',
    timezone: 'Asia/Kuala_Lumpur',
    dateFormat: 'DD/MM/YYYY',
    emailNotificationsEnabled: true,
    sessionTimeoutMinutes: 30,
    maintenanceMode: false,
  },
  useTenantSettings: () => ({
    data: {
      id: 'tenant-settings-1',
      timezone: 'Asia/Kuala_Lumpur',
      dateFormat: 'DD/MM/YYYY',
      emailNotificationsEnabled: true,
      sessionTimeoutMinutes: 30,
      maintenanceMode: false,
    },
  }),
  useUpdateTenantSettings: () => ({
    mutate: mockUpdateTenantSettings,
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
    mockUpdateBranding.mockReset();
    mockUpdateTenantSettings.mockReset();
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
    expect(screen.getByText('Tenant identity and platform defaults')).toBeInTheDocument();
    expect(screen.getByText('Governance notes')).toBeInTheDocument();
    expect(screen.getByText('Branding assets')).toBeInTheDocument();
    expect(screen.getByText('Session timeout')).toBeInTheDocument();
    expect(screen.getByText('Company Branding')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Governed notification defaults that define the tenant baseline for email-enabled workflows.')).toBeInTheDocument();
  });

  it('requires a governance reason before branding changes can be saved', () => {
    render(<AdminSettingsPage />);

    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'FL Group Holdings' },
    });

    expect(screen.getByLabelText('Governance reason')).toBeInTheDocument();
    const saveBrandingButton = screen.getByText('Save Branding').closest('button');
    expect(saveBrandingButton).toBeDisabled();
  });

  it('requires a governance reason before tenant settings can be saved', () => {
    render(<AdminSettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: /reset tenant defaults/i }));

    expect(screen.getByLabelText('Governance reason for tenant defaults')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save tenant settings/i })).toBeDisabled();
  });
});
