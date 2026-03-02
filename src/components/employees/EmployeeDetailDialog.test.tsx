import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmployeeDetailDialog } from '@/components/employees/EmployeeDetailDialog';
import type { Profile, Department } from '@/types/hrms';

const department: Department = {
  id: 'dept-ops',
  name: 'Operations',
  description: 'Operations team',
  manager_id: null,
  created_at: '2026-02-20T00:00:00.000Z',
  updated_at: '2026-02-20T00:00:00.000Z',
};

const baseEmployee: Profile & { department: Department | null } = {
  id: 'user-employee',
  employee_id: 'EMP-001',
  email: 'employee@flchrms.test',
  username: 'employee.test',
  first_name: 'Evelyn',
  last_name: 'Employee',
  phone: '+10000000006',
  avatar_url: null,
  department_id: department.id,
  job_title: 'Operations Executive',
  hire_date: null,
  manager_id: null,
  status: 'on_leave',
  created_at: '2026-02-20T00:00:00.000Z',
  updated_at: '2026-02-20T00:00:00.000Z',
  department,
};

describe('EmployeeDetailDialog', () => {
  it('renders standardized status badge and role chip', () => {
    render(
      <EmployeeDetailDialog
        employee={baseEmployee}
        open
        onOpenChange={() => undefined}
        userRole="general_manager"
        viewerRole="manager"
      />,
    );

    expect(screen.getByText('Employee Details')).toBeInTheDocument();
    expect(screen.getAllByText('on leave').length).toBeGreaterThan(0);
    expect(screen.getAllByText('general manager').length).toBeGreaterThan(0);
  });

  it('shows sensitive identifier/contact fields for admin viewers (elevated privileges)', () => {
    render(
      <EmployeeDetailDialog
        employee={baseEmployee}
        open
        onOpenChange={() => undefined}
        userRole="employee"
        viewerRole="admin"
      />,
    );

    // Admin now has elevated privileges — sensitive data is visible, not restricted
    expect(screen.queryByText('Restricted')).not.toBeInTheDocument();
    expect(screen.getByText('+10000000006')).toBeInTheDocument();
  });
});
