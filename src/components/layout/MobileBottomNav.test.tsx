import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { MobileBottomNav } from './MobileBottomNav';
import { buildBottomNavItems } from './mobile-bottom-nav-config';

let mockRole = 'employee';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    role: mockRole,
  }),
}));

vi.mock('./ShellNotificationsProvider', () => ({
  useShellNotifications: () => ({
    unreadCount: 5,
  }),
}));

describe('MobileBottomNav', () => {
  it('uses the employee-first mobile route set for self-service roles', () => {
    mockRole = 'employee';
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav onOpenSidebar={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /leave/i })).toHaveAttribute('href', '/leave');
    expect(screen.getByRole('link', { name: /payroll/i })).toHaveAttribute('href', '/payroll');
    expect(screen.getByRole('link', { name: /notifications/i })).toHaveAttribute('href', '/notifications');
    expect(screen.getByRole('button', { name: /more navigation/i })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('switches the third slot to employee directory for manager roles', () => {
    expect(buildBottomNavItems('manager').map((item) => item.href)).toEqual([
      '/dashboard',
      '/leave',
      '/employees',
      '/notifications',
    ]);
  });

  it('uses the people-operations journey for hr and director roles', () => {
    expect(buildBottomNavItems('hr').map((item) => item.href)).toEqual([
      '/dashboard',
      '/leave',
      '/employees',
      '/notifications',
    ]);

    expect(buildBottomNavItems('director').map((item) => item.href)).toEqual([
      '/dashboard',
      '/leave',
      '/employees',
      '/notifications',
    ]);
  });

  it('uses the governance journey for admin roles', () => {
    expect(buildBottomNavItems('admin').map((item) => item.href)).toEqual([
      '/dashboard',
      '/employees',
      '/admin',
      '/notifications',
    ]);
  });
});
