import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmployeeTable } from '@/modules/employees/components/EmployeeTable';

const employees = [
  {
    id: 'emp-1',
    employee_id: 'EMP-001',
    email: 'jane@flchrms.test',
    username: 'jane.doe',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '+1234567',
    avatar_url: null,
    department_id: 'dept-1',
    job_title: 'Operations Lead',
    hire_date: '2025-01-01',
    manager_id: null,
    status: 'active' as const,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    department: {
      id: 'dept-1',
      name: 'Operations',
      description: null,
      manager_id: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  },
];

describe('EmployeeTable', () => {
  it('does not open the drawer when selection checkbox is clicked', () => {
    const onSelectedIdsChange = vi.fn();
    const onOpenEmployee = vi.fn();

    render(
      <EmployeeTable
        employees={employees}
        loading={false}
        selectedIds={[]}
        onSelectedIdsChange={onSelectedIdsChange}
        onOpenEmployee={onOpenEmployee}
        getUserRole={() => 'employee'}
        roleColors={{
          admin: '',
          hr: '',
          director: '',
          general_manager: '',
          manager: '',
          employee: '',
        }}
        canSelectRows
        canViewSensitiveIdentifiers
      />,
    );

    fireEvent.click(screen.getAllByLabelText(/Select Jane Doe/i)[0]);

    expect(onSelectedIdsChange).toHaveBeenCalledWith(['emp-1']);
    expect(onOpenEmployee).not.toHaveBeenCalled();
  });

  it('opens the selected employee when a row/card is activated', () => {
    const onSelectedIdsChange = vi.fn();
    const onOpenEmployee = vi.fn();

    render(
      <EmployeeTable
        employees={employees}
        loading={false}
        selectedIds={[]}
        onSelectedIdsChange={onSelectedIdsChange}
        onOpenEmployee={onOpenEmployee}
        getUserRole={() => 'employee'}
        roleColors={{
          admin: '',
          hr: '',
          director: '',
          general_manager: '',
          manager: '',
          employee: '',
        }}
        canSelectRows={false}
        canViewSensitiveIdentifiers
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Open employee record for Jane Doe/i })[0]);

    expect(onOpenEmployee).toHaveBeenCalledWith(employees[0], expect.any(HTMLElement));
  });
});
