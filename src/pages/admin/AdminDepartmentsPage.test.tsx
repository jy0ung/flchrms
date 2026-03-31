import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminDepartmentsPage from '@/pages/admin/AdminDepartmentsPage';

let mockCapabilityLoading = false;
let mockCanManageDepartments = true;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canManageDepartments: mockCanManageDepartments,
    },
    isLoading: mockCapabilityLoading,
  }),
}));

vi.mock('@/components/admin/AdminWorkspaceBridge', () => ({
  AdminWorkspaceBridge: ({ children }: { children: ReactNode }) => (
    <div>
      <div>Mock admin workspace bridge</div>
      {children}
    </div>
  ),
}));

vi.mock('@/modules/departments', () => ({
  DepartmentsPage: () => <div>Mock departments workspace</div>,
}));

describe('AdminDepartmentsPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
    mockCanManageDepartments = true;
  });

  it('renders a structured loading preview while department workspace capability checks resolve', () => {
    mockCapabilityLoading = true;

    render(<AdminDepartmentsPage />);

    expect(screen.getByText('Loading department workspace')).toBeInTheDocument();
    expect(screen.getByText('Department directory')).toBeInTheDocument();
  });

  it('renders the canonical department workspace bridge after capability checks complete', () => {
    render(<AdminDepartmentsPage />);

    expect(screen.getByText('Mock admin workspace bridge')).toBeInTheDocument();
    expect(screen.getByText('Mock departments workspace')).toBeInTheDocument();
  });
});
