import { lazy, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';

let mockIsLoading = false;
let mockUser: { id: string } | null = { id: 'user-1' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/components/layout/AppSidebar', () => ({
  AppSidebar: () => <div>AppSidebar</div>,
}));

vi.mock('@/components/layout/TopBar', () => ({
  TopBar: () => <div>TopBar</div>,
}));

vi.mock('@/components/layout/MobileBottomNav', () => ({
  MobileBottomNav: () => <div>MobileBottomNav</div>,
}));

vi.mock('@/components/layout/ShellNotificationsProvider', () => ({
  ShellNotificationsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/system')>();

  return {
    ...actual,
    AppPageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    InteractionModeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

describe('AppLayout', () => {
  it('keeps the app shell visible while a lazy route is still loading', () => {
    mockIsLoading = false;
    mockUser = { id: 'user-1' };
    const LazyPage = lazy(() => new Promise<never>(() => undefined));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<LazyPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('AppSidebar')).toBeInTheDocument();
    expect(screen.getByText('TopBar')).toBeInTheDocument();
    expect(screen.getByText('Loading workspace')).toBeInTheDocument();
    expect(
      screen.getByText('Preparing the next page while keeping your workspace shell in place.'),
    ).toBeInTheDocument();
  });

  it('shows an inline refresh state when auth context is warming with an existing user', () => {
    mockIsLoading = true;
    mockUser = { id: 'user-1' };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('AppSidebar')).toBeInTheDocument();
    expect(screen.getByText('TopBar')).toBeInTheDocument();
    expect(screen.getByText('Refreshing workspace access')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Updating your role, profile, and shell context without interrupting the current layout.',
      ),
    ).toBeInTheDocument();
  });
});
