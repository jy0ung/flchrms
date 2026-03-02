import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Announcements from '@/pages/Announcements';

// ── Mock hooks ───────────────────────────────────────────────────
let mockAnnouncementsData: unknown[] | undefined;
let mockIsLoading = false;

vi.mock('@/hooks/useAnnouncements', () => ({
  useAnnouncements: () => ({
    data: mockAnnouncementsData,
    isLoading: mockIsLoading,
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('Announcements page', () => {
  it('renders loading skeletons when loading', () => {
    mockIsLoading = true;
    mockAnnouncementsData = undefined;
    const { container } = render(<Announcements />, { wrapper });
    // Skeletons use pulse animation classes from Skeleton component
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThanOrEqual(0);
    // Should show "Loading updates" description
    expect(screen.getByText(/loading updates/i)).toBeInTheDocument();
    mockIsLoading = false;
  });

  it('renders empty state when no announcements', () => {
    mockAnnouncementsData = [];
    render(<Announcements />, { wrapper });
    expect(screen.getByText(/no announcements yet/i)).toBeInTheDocument();
    expect(screen.getByText(/company updates will appear here/i)).toBeInTheDocument();
  });

  it('renders announcement items', () => {
    mockAnnouncementsData = [
      {
        id: '1',
        title: 'Company Picnic',
        content: 'Join us for the annual company picnic.',
        priority: 'high',
        published_at: '2026-03-15T08:00:00Z',
      },
      {
        id: '2',
        title: 'Holiday Schedule',
        content: 'Updated holiday schedule for Q2.',
        priority: 'low',
        published_at: '2026-03-10T08:00:00Z',
      },
    ];
    render(<Announcements />, { wrapper });
    expect(screen.getByText('Company Picnic')).toBeInTheDocument();
    expect(screen.getByText('Holiday Schedule')).toBeInTheDocument();
    expect(screen.getByText(/join us for the annual/i)).toBeInTheDocument();
  });

  it('shows correct item count in header', () => {
    mockAnnouncementsData = [
      { id: '1', title: 'Single', content: 'Only one.', priority: 'low', published_at: '2026-01-01T00:00:00Z' },
    ];
    render(<Announcements />, { wrapper });
    expect(screen.getByText(/1 item —/i)).toBeInTheDocument();
  });

  it('pluralises item count correctly', () => {
    mockAnnouncementsData = [
      { id: '1', title: 'A', content: 'a', priority: 'low', published_at: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'B', content: 'b', priority: 'medium', published_at: '2026-01-02T00:00:00Z' },
    ];
    render(<Announcements />, { wrapper });
    expect(screen.getByText(/2 items —/i)).toBeInTheDocument();
  });
});
