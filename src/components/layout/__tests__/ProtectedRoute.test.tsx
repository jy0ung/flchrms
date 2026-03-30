import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import type { AppRole } from '@/types/hrms';

// ── Mock variables ───────────────────────────────────────────────
let mockUser: { id: string } | null = { id: 'u1' };
let mockRole: AppRole | null = 'employee';
let mockIsLoading = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: mockRole,
    isLoading: mockIsLoading,
  }),
}));

function renderProtected(allowedRoles: AppRole[], startPath = '/protected') {
  const AuthPage = () => {
    const location = useLocation();

    return (
      <div data-testid="auth-page">
        Auth Page
        <span data-testid="auth-location">{`${location.pathname}${location.search}`}</span>
      </div>
    );
  };

  return render(
    <MemoryRouter initialEntries={[startPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows loading spinner when auth is loading', () => {
    mockIsLoading = true;
    mockUser = null;
    mockRole = null;
    renderProtected(['employee']);
    expect(screen.getByText('Loading access rules')).toBeInTheDocument();
    expect(screen.getByText('Checking your account and route permissions.')).toBeInTheDocument();
    mockIsLoading = false;
  });

  it('keeps authenticated content mounted while auth context is still hydrating', () => {
    mockIsLoading = true;
    mockUser = { id: 'u1' };
    mockRole = null;

    renderProtected(['employee']);

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();

    mockIsLoading = false;
  });

  it('redirects to /auth when no user', () => {
    mockUser = null;
    mockRole = null;
    renderProtected(['employee'], '/protected?view=team');
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
    expect(screen.getByTestId('auth-location')).toHaveTextContent(
      '/auth?redirect=%2Fprotected%3Fview%3Dteam',
    );
  });

  it('redirects to /dashboard when user has wrong role', () => {
    mockUser = { id: 'u1' };
    mockRole = 'employee';
    renderProtected(['admin', 'director']);
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('redirects to /dashboard when role is null', () => {
    mockUser = { id: 'u1' };
    mockRole = null;
    renderProtected(['employee']);
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  it('renders children when user has an allowed role', () => {
    mockUser = { id: 'u1' };
    mockRole = 'admin';
    renderProtected(['admin', 'director']);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('renders children for employee role', () => {
    mockUser = { id: 'u1' };
    mockRole = 'employee';
    renderProtected(['employee']);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('renders children for any matching role in allowedRoles', () => {
    mockUser = { id: 'u1' };
    mockRole = 'manager';
    renderProtected(['employee', 'manager', 'admin']);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
