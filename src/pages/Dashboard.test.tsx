import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Dashboard from '@/pages/Dashboard';
import { InteractionModeProvider } from '@/components/system';
import type { AppRole } from '@/types/hrms';
import type { DashboardLayoutStateV2 } from '@/lib/dashboard-layout';

let mockRole: AppRole = 'employee';
let mockTodayAttendance: { clock_in?: string | null; clock_out?: string | null; status?: string } | null = null;
let mockLeaveBalances: Array<{
  leave_type_id: string;
  days_remaining?: number;
  days_used?: number;
  days_pending?: number;
  is_unlimited?: boolean;
}> = [];
let mockEnrollments: Array<{ id: string }> = [];
let mockReviews: Array<{ id: string }> = [];
let mockIsMobile = false;

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { first_name: 'Evelyn' },
    role: mockRole,
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await import('react');
  const DropdownMenuContext = React.createContext<{
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  } | null>(null);

  function useDropdownMenuContext() {
    const context = React.useContext(DropdownMenuContext);
    if (!context) {
      throw new Error('DropdownMenu mock must be used within DropdownMenu');
    }
    return context;
  }

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = React.useState(false);
      return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
          {children}
        </DropdownMenuContext.Provider>
      );
    },
    DropdownMenuTrigger: ({
      asChild,
      children,
    }: {
      asChild?: boolean;
      children: React.ReactElement;
    }) => {
      const { setOpen } = useDropdownMenuContext();
      if (asChild) {
        return React.cloneElement(children, {
          onClick: (event: React.MouseEvent) => {
            children.props.onClick?.(event);
            setOpen(true);
          },
        });
      }

      return (
        <button type="button" onClick={() => setOpen(true)}>
          {children}
        </button>
      );
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = useDropdownMenuContext();
      return open ? <div role="menu">{children}</div> : null;
    },
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({
      children,
      onSelect,
      disabled,
    }: {
      children: React.ReactNode;
      onSelect?: (event: { preventDefault: () => void }) => void;
      disabled?: boolean;
    }) => {
      const { setOpen } = useDropdownMenuContext();
      return (
        <button
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => {
            onSelect?.({ preventDefault: () => undefined });
            setOpen(false);
          }}
        >
          {children}
        </button>
      );
    },
  };
});

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
  verticalCompactor: { type: 'vertical', allowOverlap: false },
}));

vi.mock('@/hooks/useMeasuredContainerWidth', () => ({
  useMeasuredContainerWidth: () => ({
    width: 1200,
    mounted: true,
    containerRef: vi.fn(),
    measureWidth: vi.fn(),
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
    data: mockTodayAttendance,
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
    data: mockLeaveBalances,
  }),
}));

vi.mock('@/hooks/useTraining', () => ({
  useMyEnrollments: () => ({
    isLoading: false,
    data: mockEnrollments,
  }),
}));

vi.mock('@/hooks/usePerformance', () => ({
  useMyReviews: () => ({
    isLoading: false,
    data: mockReviews,
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

function openDashboardCustomizeMenu() {
  const trigger = screen.getByRole('button', { name: /customize dashboard/i });
  fireEvent.click(trigger);
  return trigger;
}

describe('Dashboard widget rendering', () => {
  beforeEach(() => {
    mockSaveLayout.mockClear();
    mockResetLayout.mockClear();
    capturedResizeConfig = undefined;
    mockIsMobile = false;
    mockTodayAttendance = null;
    mockLeaveBalances = [];
    mockEnrollments = [];
    mockReviews = [];
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

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    // Greeting shows profile first name somewhere on the page
    expect(screen.getByText(/Evelyn/)).toBeInTheDocument();
  });

  it('demotes dashboard utilities into a single customize control', async () => {
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

    expect(screen.getByText('View preferences')).toBeInTheDocument();
    expect(screen.getByText(/Personalize the dashboard after you review today's priorities/i)).toBeInTheDocument();

    openDashboardCustomizeMenu();

    expect(await screen.findByText('Dashboard tools')).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /edit layout/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /manage widgets/i })).toBeInTheDocument();
  });

  it('renders a task-first onboarding dashboard for low-data employee accounts', () => {
    mockRole = 'employee';
    mockLayoutState = {
      version: 2,
      presetVersion: 6,
      role: 'employee',
      widgets: [],
    };
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Start Here' })).toBeInTheDocument();
    expect(screen.getByText('Clock In or Review Attendance')).toBeInTheDocument();
    expect(screen.getByText('Request Leave')).toBeInTheDocument();
    expect(screen.getByText('Complete Profile')).toBeInTheDocument();
    expect(screen.getByText('View Payroll')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Operational Status' })).not.toBeInTheDocument();
  });

  it('renders visible widgets inside the fixed priority sections', () => {
    mockRole = 'employee';
    mockTodayAttendance = {
      clock_in: '2026-03-13T08:00:00Z',
      clock_out: null,
      status: 'present',
    };
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

    expect(screen.getByText('Act first')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operational Status' })).toBeInTheDocument();
    expect(screen.getByText('Today Attendance')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supporting Information' })).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Inbox' })).toBeInTheDocument();
    expect(screen.getByText('View preferences')).toBeInTheDocument();
    expect(screen.queryByTestId('rgl-grid')).not.toBeInTheDocument();
  });

  it('keeps supporting information widgets in a compact reference band for employee views', () => {
    mockRole = 'employee';
    mockLeaveBalances = [{ leave_type_id: 'annual', days_remaining: 8, days_used: 1, days_pending: 0, is_unlimited: false }];
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

    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supporting Information' })).toBeInTheDocument();
    expect(screen.getByText('Updates, personal progress, and schedule context.')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('does not render hidden widgets', () => {
    mockRole = 'employee';
    mockLeaveBalances = [{ leave_type_id: 'annual', days_remaining: 8, days_used: 1, days_pending: 0, is_unlimited: false }];
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

    expect(screen.getByText('High priority')).toBeInTheDocument();
    expect(screen.getByText('Act now')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Required Actions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operational Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Organization Metrics' })).toBeInTheDocument();
    expect(screen.queryByTestId('rgl-grid')).not.toBeInTheDocument();
  });

  it('enters edit mode and renders the react-grid-layout container', async () => {
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

    openDashboardCustomizeMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: /edit layout/i }));

    const grid = screen.getByTestId('rgl-grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('dashboard-edit-grid');
    expect(grid.children.length).toBe(2);
  });

  it('provides east/west plus corner resize handles in edit mode', async () => {
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

    openDashboardCustomizeMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: /edit layout/i }));

    expect(capturedResizeConfig).toBeDefined();
    expect(capturedResizeConfig!.handles).toContain('e');
    expect(capturedResizeConfig!.handles).toContain('w');
    expect(capturedResizeConfig!.handles).toContain('se');
    expect(capturedResizeConfig!.handles).toContain('sw');
  });
});
