import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Dashboard from '@/pages/Dashboard';
import { InteractionModeProvider } from '@/components/system';
import type { AppRole } from '@/types/hrms';

let mockRole: AppRole = 'employee';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { first_name: 'Evelyn' },
    role: mockRole,
  }),
}));

vi.mock('@/hooks/useAnnouncements', () => ({
  useAnnouncements: () => ({
    isLoading: false,
    data: [],
  }),
}));

vi.mock('@/hooks/useAttendance', () => ({
  useTodayAttendance: () => ({
    data: null,
  }),
  useClockIn: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useClockOut: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useLeaveBalance', () => ({
  useLeaveBalance: () => ({
    isLoading: false,
    data: [],
  }),
}));

vi.mock('@/hooks/useTraining', () => ({
  useMyEnrollments: () => ({
    isLoading: false,
    data: [],
  }),
}));

vi.mock('@/hooks/usePerformance', () => ({
  useMyReviews: () => ({
    isLoading: false,
    data: [],
  }),
}));

vi.mock('@/hooks/useExecutiveStats', () => ({
  useExecutiveStats: () => ({
    isLoading: false,
    data: null,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <InteractionModeProvider resetOnRouteChange={false}>
          <Dashboard />
        </InteractionModeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard widget action affordance', () => {
  it('does not render Leave Balance widget on dashboard', () => {
    mockRole = 'employee';
    renderDashboard();

    expect(screen.queryByText(/^Leave Balance$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open leave management/i })).not.toBeInTheDocument();
  });

  it('renders lane regions in customize mode without semantic size tokens', () => {
    mockRole = 'employee';
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /Dashboard interaction mode|Customize Dashboard/i }));

    expect(screen.getByRole('region', { name: 'Primary Widgets' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Secondary Widgets' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Supporting Widgets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restore Hidden/i })).toBeInTheDocument();
    expect(screen.queryByText(/Size\s+[SML]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+\/12/)).not.toBeInTheDocument();
  });

  it('shows Apply Admin Template action for manager roles in customize mode', () => {
    mockRole = 'manager';
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /Dashboard interaction mode|Customize Dashboard/i }));

    expect(screen.getByRole('button', { name: /Apply Admin Template/i })).toBeInTheDocument();
  });
});
