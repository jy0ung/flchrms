import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Dashboard from '@/pages/Dashboard';
import { InteractionModeProvider } from '@/components/system';
import type { AppRole } from '@/types/hrms';
import type { DashboardLayoutStateV2 } from '@/lib/dashboard-layout';

let mockRole: AppRole = 'employee';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { first_name: 'Evelyn' },
    role: mockRole,
  }),
}));

// Mock useDashboardLayout to return deterministic layout
const mockSaveLayout = vi.fn();
const mockResetLayout = vi.fn();

let mockLayoutState: DashboardLayoutStateV2 = {
  version: 2,
  presetVersion: 6,
  role: 'employee',
  widgets: [],
};

vi.mock('@/hooks/useDashboardLayout', () => ({
  useDashboardLayout: () => ({
    visibleWidgets: mockLayoutState.widgets.filter(w => w.visible).map(w => ({ id: w.id, w: w.w, visible: w.visible })),
    allWidgets: mockLayoutState.widgets.map(w => ({ id: w.id, w: w.w, visible: w.visible })),
    layoutState: mockLayoutState,
    isLoading: false,
    isSaving: false,
    isResetting: false,
    saveLayout: mockSaveLayout,
    resetLayout: mockResetLayout,
    role: mockRole,
  }),
  mergeRglLayoutIntoState: vi.fn(),
}));

// Mock react-grid-layout to avoid DOM measurement issues in tests
let capturedResizeConfig: { enabled: boolean; handles: string[] } | undefined;

vi.mock('react-grid-layout', () => ({
  ReactGridLayout: ({ children, className, resizeConfig }: { children: React.ReactNode; layout: unknown[]; className?: string; resizeConfig?: { enabled: boolean; handles: string[] } }) => {
    capturedResizeConfig = resizeConfig;
    return <div data-testid="rgl-grid" className={className}>{children}</div>;
  },
  useContainerWidth: () => ({
    width: 1200,
    mounted: true,
    containerRef: { current: null },
    measureWidth: vi.fn(),
  }),
  verticalCompactor: { type: 'vertical', allowOverlap: false },
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
  useReviewsToConduct: () => ({
    isLoading: false,
    data: [],
  }),
}));

vi.mock('@/hooks/useExecutiveStats', () => ({
  useExecutiveStats: () => ({
    isLoading: false,
    data: null,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useUserNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isRefreshing: false,
    refetch: vi.fn(),
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

describe('Dashboard widget rendering', () => {
  beforeEach(() => {
    mockSaveLayout.mockClear();
    mockResetLayout.mockClear();
    capturedResizeConfig = undefined;
  });

  it('renders the greeting section', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 6,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
      ],
    };
    renderDashboard();

    // Greeting shows profile first name somewhere on the page
    expect(screen.getByText(/Evelyn/)).toBeInTheDocument();
  });

  it('renders the Edit and Widgets buttons', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 6,
      role: 'employee',
      widgets: [],
    };
    renderDashboard();

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /widgets/i })).toBeInTheDocument();
  });

  it('renders visible widgets inside the fixed priority sections', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 6,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
        { id: 'recentActivity', x: 8, y: 0, w: 4, h: 4, visible: true },
      ],
    };
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Operational Status' })).toBeInTheDocument();
    expect(screen.getByText('Today Attendance')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supporting Information' })).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.queryByTestId('rgl-grid')).not.toBeInTheDocument();
  });

  it('keeps supporting information widgets in a compact reference band for employee views', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 6,
      role: 'employee',
      widgets: [
        { id: 'announcements', x: 0, y: 0, w: 12, h: 4, visible: true },
        { id: 'recentActivity', x: 0, y: 4, w: 4, h: 4, visible: true },
        { id: 'calendarPreview', x: 4, y: 4, w: 4, h: 4, visible: true },
      ],
    };
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Supporting Information' })).toBeInTheDocument();
    expect(screen.getByText('Updates, personal progress, and schedule context.')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('does not render hidden widgets', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 6,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
        { id: 'recentActivity', x: 8, y: 0, w: 4, h: 4, visible: false },
      ],
    };
    renderDashboard();

    expect(screen.getByText('Today Attendance')).toBeInTheDocument();
    expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
  });

  it('renders the decision-first sections for manager views', () => {
    mockRole = 'manager';
    mockLayoutState = {
      version: 2,
      presetVersion: 6,
      role: 'manager',
      widgets: [
        { id: 'criticalInsights', x: 0, y: 0, w: 8, h: 4, visible: true },
        { id: 'pendingActions', x: 8, y: 0, w: 4, h: 4, visible: true },
        { id: 'charts', x: 0, y: 0, w: 12, h: 6, visible: true },
        { id: 'teamSnapshot', x: 0, y: 6, w: 8, h: 4, visible: true },
        { id: 'onLeaveToday', x: 8, y: 6, w: 4, h: 4, visible: true },
      ],
    };
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Required Actions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operational Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Organization Metrics' })).toBeInTheDocument();
    expect(screen.queryByTestId('rgl-grid')).not.toBeInTheDocument();
  });

  it('enters edit mode and renders the react-grid-layout container', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 7,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
        { id: 'calendarPreview', x: 8, y: 0, w: 4, h: 4, visible: true },
      ],
    };
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const grid = screen.getByTestId('rgl-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBe(2);
  });

  it('provides east/west plus corner resize handles in edit mode', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 7,
      role: 'employee',
      widgets: [
        { id: 'attendanceToday', x: 0, y: 0, w: 8, h: 4, visible: true },
        { id: 'calendarPreview', x: 8, y: 0, w: 4, h: 4, visible: true },
      ],
    };
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(capturedResizeConfig).toBeDefined();
    expect(capturedResizeConfig!.handles).toContain('e');
    expect(capturedResizeConfig!.handles).toContain('w');
    expect(capturedResizeConfig!.handles).toContain('se');
    expect(capturedResizeConfig!.handles).toContain('sw');
  });
});
