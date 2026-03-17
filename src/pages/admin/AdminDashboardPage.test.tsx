import { render, screen } from '@testing-library/react';
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
  it('renders the decision-first governance hierarchy above reference analytics', () => {
    mockCapabilityLoading = false;
    render(<AdminDashboardPage />);

    expect(screen.getByText('Active Employees')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Governance Priorities', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reference Analytics', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Governance Coverage')).toBeInTheDocument();
    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByText('Focus: operational oversight')).toBeInTheDocument();
  });

  it('renders an explicit loading state while governance capabilities are resolving', () => {
    mockCapabilityLoading = true;

    render(<AdminDashboardPage />);

    expect(screen.getByText('Loading governance overview')).toBeInTheDocument();
  });
});
