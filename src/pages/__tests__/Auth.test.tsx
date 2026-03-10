import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Auth from '@/pages/Auth';

const {
  signInMock,
  updateUserMock,
  signOutLocalSessionMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn(),
  updateUserMock: vi.fn(),
  signOutLocalSessionMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: signInMock,
    signUp: vi.fn(),
    user: null,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
      resetPasswordForEmail: vi.fn(),
      updateUser: updateUserMock,
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth-signout', () => ({
  signOutLocalSession: signOutLocalSessionMock,
}));

vi.mock('@/components/auth/AuthCard', () => ({
  AuthCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/auth/LoginForm', () => ({
  LoginForm: ({
    onSubmit,
  }: {
    onSubmit: (payload: { identifier: string; password: string }) => Promise<{ error: Error | null }>;
  }) => (
    <button
      type="button"
      onClick={() => {
        void onSubmit({ identifier: 'employee@flchrms.test', password: 'Test1234!' });
      }}
    >
      Mock Sign In
    </button>
  ),
}));

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns users to the requested route after sign-in', async () => {
    signInMock.mockResolvedValue({ error: null });

    render(
      <MemoryRouter initialEntries={['/auth?redirect=%2Fpayroll%3Ftab%3Dpayslips']}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/payroll" element={<div data-testid="payroll-page">Payroll Page</div>} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mock Sign In' }));

    expect(await screen.findByTestId('payroll-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
  });

  it('uses local-session sign-out after recovery password update', async () => {
    updateUserMock.mockResolvedValue({ error: null });
    signOutLocalSessionMock.mockResolvedValue({ error: null });
    window.history.replaceState({}, '', '/auth?type=recovery');

    render(
      <MemoryRouter initialEntries={['/auth?type=recovery']}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'BetterPass123!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'BetterPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: 'BetterPass123!' });
      expect(signOutLocalSessionMock).toHaveBeenCalledTimes(1);
    });
  });

  it('uses local-session sign-out when cancelling recovery mode', async () => {
    signOutLocalSessionMock.mockResolvedValue({ error: null });
    window.history.replaceState({}, '', '/auth?type=recovery');

    render(
      <MemoryRouter initialEntries={['/auth?type=recovery']}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(signOutLocalSessionMock).toHaveBeenCalledTimes(1);
    });
  });
});
