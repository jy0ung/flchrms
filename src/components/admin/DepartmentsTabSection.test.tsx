import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DepartmentsTabSection } from '@/components/admin/DepartmentsTabSection';
import type { Department, Profile } from '@/types/hrms';

function makeDepartment(overrides: Partial<Department> = {}): Department {
  return {
    id: 'dept-1',
    name: 'Operations',
    description: 'Ops department',
    manager_id: null,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'emp-1',
    first_name: 'Mason',
    last_name: 'Manager',
    email: 'manager@flchrms.test',
    phone: null,
    employee_id: 'TST-MGR-001',
    department_id: 'dept-1',
    department: null,
    job_title: 'Manager',
    hire_date: null,
    status: 'active',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    username: 'manager.test',
    ...overrides,
  };
}

describe('DepartmentsTabSection SectionToolbar and accessibility', () => {
  it('renders toolbar region and forwards search input changes', () => {
    const onDepartmentSearchChange = vi.fn();

    render(
      <DepartmentsTabSection
        departments={[makeDepartment()]}
        filteredDepartments={[makeDepartment()]}
        employees={[makeEmployee()]}
        departmentSearch=""
        onDepartmentSearchChange={onDepartmentSearchChange}
        canManageDepartments
        deleteDepartmentPending={false}
        onOpenCreateDepartment={vi.fn()}
        onEditDepartment={vi.fn()}
        onDeleteDepartment={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: /Department management search/i })).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: /Search departments/i });
    fireEvent.change(input, { target: { value: 'Ops' } });

    expect(onDepartmentSearchChange).toHaveBeenCalledWith('Ops');
  });

  it('exposes aria labels for icon-only desktop action buttons', () => {
    render(
      <DepartmentsTabSection
        departments={[makeDepartment()]}
        filteredDepartments={[makeDepartment()]}
        employees={[makeEmployee()]}
        departmentSearch=""
        onDepartmentSearchChange={vi.fn()}
        canManageDepartments
        deleteDepartmentPending={false}
        onOpenCreateDepartment={vi.fn()}
        onEditDepartment={vi.fn()}
        onDeleteDepartment={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Edit department Operations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete department Operations/i })).toBeInTheDocument();
  });
});
