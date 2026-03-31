import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AdminEmployeesPage from '@/pages/admin/AdminEmployeesPage';

let mockCapabilityLoading = false;
let mockCanManageEmployeeProfiles = true;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin' }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canManageEmployeeProfiles: mockCanManageEmployeeProfiles,
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

vi.mock('@/modules/employees', () => ({
  EmployeesPage: () => <div>Mock employees workspace</div>,
}));

describe('AdminEmployeesPage', () => {
  beforeEach(() => {
    mockCapabilityLoading = false;
    mockCanManageEmployeeProfiles = true;
  });

  it('renders a structured loading preview while employee workspace capability checks resolve', () => {
    mockCapabilityLoading = true;

    render(<AdminEmployeesPage />);

    expect(screen.getByText('Loading employee workspace')).toBeInTheDocument();
    expect(screen.getByText('Employee directory')).toBeInTheDocument();
  });

  it('renders the canonical employee workspace bridge after capability checks complete', () => {
    render(<AdminEmployeesPage />);

    expect(screen.getByText('Mock admin workspace bridge')).toBeInTheDocument();
    expect(screen.getByText('Mock employees workspace')).toBeInTheDocument();
  });
});
