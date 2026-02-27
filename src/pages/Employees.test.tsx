import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Employees from '@/pages/Employees';

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
  it('opens employee details from keyboard activation on card row', () => {
    render(<Employees />);

    const cardButton = screen.getByRole('button', { name: /View employee details for Evelyn Employee/i });
    cardButton.focus();
    fireEvent.keyDown(cardButton, { key: 'Enter' });

    expect(screen.getByText('Employee Details')).toBeInTheDocument();
  });
});

