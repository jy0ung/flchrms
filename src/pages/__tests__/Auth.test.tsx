import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Auth from '@/pages/Auth';

const signInMock = vi.fn();

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
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
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
});
