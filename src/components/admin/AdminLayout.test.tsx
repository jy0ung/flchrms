import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AdminLayout } from './AdminLayout';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1' },
    role: 'admin',
    isLoading: false,
  }),
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useMyAdminCapabilities: () => ({
    capabilityMap: {},
    isLoading: false,
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
});
