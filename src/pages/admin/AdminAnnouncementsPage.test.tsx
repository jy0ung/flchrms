import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminAnnouncementsPage from '@/pages/admin/AdminAnnouncementsPage';

let mockCapabilityLoading = false;
let mockAnnouncementsLoading = false;
let mockAnnouncements: Array<{
  id: string;
  title: string;
  content: string;
  priority: string;
  published_at: string | null;
  created_at: string;
  expires_at: string | null;
}> = [];

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canManageAnnouncements: true,
    },
    isLoading: mockCapabilityLoading,
  }),
}));

vi.mock('@/hooks/useAnnouncements', () => ({
  useAnnouncements: () => ({
    data: mockAnnouncements,
    isLoading: mockAnnouncementsLoading,
  }),
  useCreateAnnouncement: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateAnnouncement: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteAnnouncement: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('AdminAnnouncementsPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
    mockAnnouncementsLoading = false;
    mockAnnouncements = [];
  });

  it('renders a structured loading preview while announcement capabilities are resolving', () => {
    mockCapabilityLoading = true;

    render(<AdminAnnouncementsPage />);

    expect(screen.getByText('Announcement Management')).toBeInTheDocument();
    expect(screen.getByText('Loading announcements')).toBeInTheDocument();
    expect(screen.getByText('Announcement queue')).toBeInTheDocument();
  });

  it('keeps the announcement table shape visible while records are still loading', () => {
    mockAnnouncementsLoading = true;

    render(<AdminAnnouncementsPage />);

    expect(screen.getByText('Current workspace')).toBeInTheDocument();
    expect(screen.getByText('Announcement queue and publication controls')).toBeInTheDocument();
    expect(screen.getByText('Published announcements')).toBeInTheDocument();
    expect(screen.getByText('Announcement queue')).toBeInTheDocument();
    expect(screen.getByText('Loading published announcements and their management actions.')).toBeInTheDocument();
  });

  it('requires a governance reason before publishing a new announcement', () => {
    render(<AdminAnnouncementsPage />);

    fireEvent.click(screen.getByRole('button', { name: /new announcement/i }));

    expect(screen.getByText('Governance Reason')).toBeInTheDocument();
    expect(screen.getByLabelText('Change reason')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
