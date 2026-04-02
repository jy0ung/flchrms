import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { TenantMaintenanceGate } from '@/components/layout/TenantMaintenanceGate';

let mockUser: { id: string } | null = null;
let mockRole: string | null = null;
let mockAuthLoading = false;
let mockSignOut = vi.fn();
let mockMaintenanceMode = false;
let mockSettingsLoading = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: mockRole,
    isLoading: mockAuthLoading,
    signOut: mockSignOut,
  }),
}));

vi.mock('@/contexts/TenantSettingsContext', () => ({
  useTenantSettingsContext: () => ({
    settings: {
      maintenanceMode: mockMaintenanceMode,
    },
    isLoading: mockSettingsLoading,
  }),
}));

describe('TenantMaintenanceGate', () => {
  beforeEach(() => {
    mockUser = null;
    mockRole = null;
    mockAuthLoading = false;
    mockMaintenanceMode = false;
    mockSettingsLoading = false;
    mockSignOut = vi.fn();
  });

  it('blocks non-admin users from app routes during maintenance mode', () => {
    mockUser = { id: 'employee-1' };
    mockRole = 'employee';
    mockMaintenanceMode = true;
    mockSettingsLoading = false;
    mockAuthLoading = false;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={(
              <TenantMaintenanceGate>
                <div>Dashboard</div>
              </TenantMaintenanceGate>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('System maintenance in progress')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('keeps the auth route reachable during maintenance mode', () => {
    mockUser = null;
    mockRole = null;
    mockMaintenanceMode = true;
    mockSettingsLoading = false;
    mockAuthLoading = false;

    render(
      <MemoryRouter initialEntries={['/auth']}>
        <Routes>
          <Route
            path="/auth"
            element={(
              <TenantMaintenanceGate>
                <div>Auth Route</div>
              </TenantMaintenanceGate>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Auth Route')).toBeInTheDocument();
  });

  it('allows admin users through during maintenance mode', () => {
    mockUser = { id: 'admin-1' };
    mockRole = 'admin';
    mockMaintenanceMode = true;
    mockSettingsLoading = false;
    mockAuthLoading = false;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={(
              <TenantMaintenanceGate>
                <div>Admin Dashboard</div>
              </TenantMaintenanceGate>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });
});
