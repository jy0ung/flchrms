import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';

let mockCapabilityLoading = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    role: 'admin',
  }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canViewAdminDashboard: true,
    },
    isLoading: mockCapabilityLoading,
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [
      { id: 'emp-1', status: 'active' },
      { id: 'emp-2', status: 'on_leave' },
      { id: 'emp-3', status: 'terminated' },
    ],
  }),
  useDepartments: () => ({
    data: [{ id: 'dept-1' }, { id: 'dept-2' }],
  }),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    data: [
      { id: 'role-1', role: 'admin' },
      { id: 'role-2', role: 'hr' },
      { id: 'role-3', role: 'manager' },
    ],
  }),
}));

vi.mock('@/hooks/useLeaveTypes', () => ({
  useLeaveTypes: () => ({
    data: [{ id: 'policy-1' }, { id: 'policy-2' }],
  }),
}));

vi.mock('@/hooks/useDashboardStats', () => ({
  useDashboardStats: () => ({
    data: {
      presentToday: 18,
      pendingLeaves: 3,
    },
  }),
}));

vi.mock('@/hooks/admin/useAdminAnalytics', () => ({
  useAdminAnalytics: () => ({
    deptDistribution: [{ department: 'HR', count: 4 }],
    leaveTrend: [{ month: 'Jan', requests: 5 }],
  }),
}));

vi.mock('@/components/admin/AdminDeptChart', () => ({
  AdminDeptChart: () => <div>Department chart</div>,
}));

vi.mock('@/components/admin/AdminLeaveTrendChart', () => ({
  AdminLeaveTrendChart: () => <div>Leave trend chart</div>,
}));

describe('AdminDashboardPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminDashboardPage />
      </MemoryRouter>,
    );
  }

  it('renders the decision-first governance hierarchy above reference analytics', () => {
    mockCapabilityLoading = false;
    renderPage();

    const prioritiesHeading = screen.getByRole('heading', { name: 'Governance Priorities', level: 2 });
    const snapshotHeading = screen.getByRole('heading', { name: 'Operational Snapshot', level: 2 });
    const analyticsHeading = screen.getByRole('heading', { name: 'Reference Analytics', level: 2 });

    expect(
      prioritiesHeading.compareDocumentPosition(snapshotHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      snapshotHeading.compareDocumentPosition(analyticsHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('Active Employees')).toBeInTheDocument();
    expect(screen.getByText('Open Governance Workspaces')).toBeInTheDocument();
    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Leave Policies')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Governance Hub/i })).toBeInTheDocument();
    expect(screen.getByText('Focus: operational oversight')).toBeInTheDocument();
  });

  it('renders an explicit loading state while governance capabilities are resolving', () => {
    mockCapabilityLoading = true;

    renderPage();

    expect(screen.getByText('Loading governance overview')).toBeInTheDocument();
  });
});
