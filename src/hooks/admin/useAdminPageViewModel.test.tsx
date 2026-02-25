import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAdminPageViewModel } from '@/hooks/admin/useAdminPageViewModel';
import type { Department, Profile } from '@/types/hrms';

const departments: Department[] = [
  {
    id: 'dep-1',
    name: 'Engineering',
    description: 'Builds product',
    manager_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'dep-2',
    name: 'HR',
    description: 'People ops',
    manager_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const employees: Profile[] = [
  {
    id: 'u-1',
    employee_id: 'EMP-001',
    email: 'alice@example.com',
    username: 'alice',
    first_name: 'Alice',
    last_name: 'Smith',
    phone: null,
    avatar_url: null,
    department_id: 'dep-1',
    job_title: 'Engineer',
    hire_date: '2025-01-01',
    manager_id: null,
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'u-2',
    employee_id: 'EMP-002',
    email: 'bob@example.com',
    username: 'bob',
    first_name: 'Bob',
    last_name: 'Jones',
    phone: null,
    avatar_url: null,
    department_id: 'dep-2',
    job_title: 'HR Officer',
    hire_date: '2025-01-01',
    manager_id: null,
    status: 'inactive',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('useAdminPageViewModel', () => {
  it('builds role lookup, stats, and admin default tab', () => {
    const { result } = renderHook(() =>
      useAdminPageViewModel({
        role: 'admin',
        employees,
        departments,
        userRoles: [
          { user_id: 'u-1', role: 'manager' },
          { user_id: 'u-2', role: 'hr' },
          { user_id: 'u-3', role: 'admin' },
        ],
      }),
    );

    expect(result.current.defaultAdminTab).toBe('roles');
    expect(result.current.getUserRole('u-1')).toBe('manager');
    expect(result.current.getUserRole('missing')).toBe('employee');
    expect(result.current.stats).toEqual({
      totalEmployees: 2,
      admins: 1,
      hrUsers: 1,
      managers: 1,
    });
  });

  it('filters employees by status and department', () => {
    const { result } = renderHook(() =>
      useAdminPageViewModel({
        role: 'hr',
        employees,
        departments,
        userRoles: [],
      }),
    );

    act(() => {
      result.current.setStatusFilter('active');
      result.current.setDepartmentFilter('dep-1');
    });

    expect(result.current.filteredEmployees?.map((e) => e.id)).toEqual(['u-1']);
  });
});
