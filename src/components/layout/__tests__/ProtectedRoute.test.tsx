import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
        <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
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
    const { container } = renderProtected(['employee']);
    // Should show spinner (Loader2 icon with animate-spin)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    mockIsLoading = false;
  });

  it('redirects to /auth when no user', () => {
    mockUser = null;
    mockRole = null;
    renderProtected(['employee']);
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
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
