import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayout } from './AdminLayout';

let mockCapabilityLoading = false;
let mockAuthLoading = false;
let mockUser = { id: 'admin-1' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: 'admin',
    isLoading: mockAuthLoading,
  }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useMyAdminCapabilities: () => ({
    capabilityMap: {},
    isLoading: mockCapabilityLoading,
  }),
}));

vi.mock('@/lib/admin-permissions', () => ({
  getAdminCapabilities: () => ({
    canAccessAdminPage: true,
  }),
}));

vi.mock('./AdminSidebar', () => ({
  AdminSidebar: () => <div>AdminSidebar</div>,
}));

vi.mock('@/components/layout/ShellNotificationsProvider', () => ({
  ShellNotificationsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <div>ThemeToggle</div>,
}));

vi.mock('@/components/layout/NotificationsBell', () => ({
  NotificationsBell: () => <div>NotificationsBell</div>,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarInset: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button type="button">Toggle Sidebar</button>,
}));

describe('AdminLayout', () => {
  it('renders a skip link for governance content', () => {
    mockCapabilityLoading = false;
    mockAuthLoading = false;
    mockUser = { id: 'admin-1' };
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /skip to governance content/i })).toHaveAttribute(
      'href',
      '#admin-main-content',
    );
  });

  it('keeps the governance shell visible while capabilities are loading', () => {
    mockCapabilityLoading = true;
    mockAuthLoading = false;
    mockUser = { id: 'admin-1' };

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminLayout />
      </MemoryRouter>,
    );

    expect(screen.getByText('AdminSidebar')).toBeInTheDocument();
    expect(screen.getByText('Loading governance workspace')).toBeInTheDocument();
    expect(
      screen.getByText('Checking your admin capabilities and preparing the governance shell.'),
    ).toBeInTheDocument();
  });

  it('keeps the governance shell visible while auth is still hydrating for an existing user', () => {
    mockCapabilityLoading = false;
    mockAuthLoading = true;
    mockUser = { id: 'admin-1' };

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminLayout />
      </MemoryRouter>,
    );

    expect(screen.getByText('AdminSidebar')).toBeInTheDocument();
    expect(screen.getByText('Loading governance workspace')).toBeInTheDocument();
  });
});
