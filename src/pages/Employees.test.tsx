import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Employees from '@/pages/Employees';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'hr' }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    isLoading: false,
    data: [
      {
        id: 'user-1',
        employee_id: 'EMP-001',
        email: 'employee1@flchrms.test',
        username: 'employee.one',
        first_name: 'Evelyn',
        last_name: 'Employee',
        phone: '+10000000006',
        avatar_url: null,
        department_id: 'dept-ops',
        job_title: 'Operations Executive',
        hire_date: null,
        manager_id: null,
        status: 'active',
        created_at: '2026-02-20T00:00:00.000Z',
        updated_at: '2026-02-20T00:00:00.000Z',
        department: {
          id: 'dept-ops',
          name: 'Operations',
          description: null,
          manager_id: null,
          created_at: '2026-02-20T00:00:00.000Z',
          updated_at: '2026-02-20T00:00:00.000Z',
        },
      },
    ],
  }),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    data: [{ user_id: 'user-1', role: 'employee' }],
  }),
}));

describe('Employees page accessibility interactions', () => {
  it('navigates to employee profile from keyboard activation on card row', () => {
    mockNavigate.mockClear();
    render(
      <MemoryRouter>
        <Employees />
      </MemoryRouter>
    );

    const cardButton = screen.getByRole('button', { name: /View employee details for Evelyn Employee/i });
    cardButton.focus();
    fireEvent.keyDown(cardButton, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/employees/user-1');
  });
});

