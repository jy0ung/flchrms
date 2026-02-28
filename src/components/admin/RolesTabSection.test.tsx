import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RolesTabSection } from '@/components/admin/RolesTabSection';
import type { AppRole, Profile, UserRole } from '@/types/hrms';

function makeEmployee(id: string, firstName: string, role: AppRole): Profile {
  return {
    id,
    first_name: firstName,
    last_name: 'User',
    email: `${firstName.toLowerCase()}@flchrms.test`,
    phone: null,
    employee_id: `TST-${id.toUpperCase()}`,
    department_id: null,
    department: undefined,
    job_title: `${role} role`,
    hire_date: null,
    status: 'active',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-02T00:00:00Z',
    username: `${firstName.toLowerCase()}.user`,
  };
}

describe('RolesTabSection governance safeguards', () => {
  it('renders governance columns and disables equal/higher-tier role actions', () => {
    const employees = [
      makeEmployee('u1', 'Diana', 'director'),
      makeEmployee('u2', 'Alice', 'admin'),
      makeEmployee('u3', 'Mason', 'manager'),
    ];

    const userRoles: UserRole[] = [
      { id: 'r1', user_id: 'u1', role: 'director', created_at: '2026-02-01T00:00:00Z' },
      { id: 'r2', user_id: 'u2', role: 'admin', created_at: '2026-02-01T00:00:00Z' },
      { id: 'r3', user_id: 'u3', role: 'manager', created_at: '2026-02-01T00:00:00Z' },
    ];

    render(
      <RolesTabSection
        rolesLoading={false}
        employees={employees}
        userRoles={userRoles}
        getUserRole={(userId) => userRoles.find((entry) => entry.user_id === userId)?.role ?? 'employee'}
        roleColors={{
          admin: 'bg-rose-50 text-rose-800 border-rose-200',
          hr: 'bg-violet-50 text-violet-800 border-violet-200',
          director: 'bg-amber-50 text-amber-800 border-amber-200',
          general_manager: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          manager: 'bg-blue-50 text-blue-800 border-blue-200',
          employee: 'bg-slate-100 text-slate-700 border-slate-300',
        }}
        viewerRole="admin"
        canManageRoles
        onEditRole={vi.fn()}
      />,
    );

    expect(screen.getByText('Authority Tier')).toBeInTheDocument();
    expect(screen.getByText('Last Modified By')).toBeInTheDocument();
    expect(screen.getByText('Last Modified Date')).toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: /Change role for Diana User/i }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getAllByRole('button', { name: /Change role for Alice User/i }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getAllByRole('button', { name: /Change role for Mason User/i }).every((button) => !button.hasAttribute('disabled'))).toBe(true);
  });
});
