import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DepartmentTable } from '@/modules/departments/components/DepartmentTable';

const departments = [
  {
    id: 'dept-ops',
    name: 'Operations',
    description: 'Ops department',
    manager_id: 'mgr-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    memberCount: 3,
    members: [],
    manager: {
      id: 'mgr-1',
      employee_id: 'EMP-001',
      email: 'manager@flchrms.test',
      username: 'manager.one',
      first_name: 'Mina',
      last_name: 'Manager',
      phone: '+123456789',
      avatar_url: null,
      department_id: 'dept-ops',
      job_title: 'Operations Manager',
      hire_date: '2024-01-01',
      manager_id: null,
      status: 'active' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      department: null,
    },
  },
];

describe('DepartmentTable', () => {
  it('opens the selected department when a row or card is activated', () => {
    const onOpenDepartment = vi.fn();

    render(
      <DepartmentTable
        departments={departments}
        loading={false}
        canViewSensitiveIdentifiers
        onOpenDepartment={onOpenDepartment}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Open department record for Operations/i })[0]);

    expect(onOpenDepartment).toHaveBeenCalledWith(departments[0], expect.any(HTMLElement));
  });
});
