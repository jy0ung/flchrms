import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DepartmentsPage } from '@/modules/departments/DepartmentsPage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'hr' }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: () => undefined,
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: {
      canAccessAdminPage: true,
      canViewAdminDashboard: true,
      canViewAdminQuickActions: true,
      canViewAdminAuditLog: false,
      canManageEmployeeProfiles: false,
      canCreateEmployee: false,
      canManageDepartments: true,
      canManageLeaveTypes: false,
      canManageAnnouncements: false,
      canManageRoles: false,
      canResetEmployeePasswords: false,
      canManageAdminSettings: false,
      canOpenAccountProfileEditor: false,
      isAdminLimitedProfileEditor: false,
      canViewSensitiveEmployeeIdentifiers: true,
    },
    isLoading: false,
    capabilityMap: {},
    isError: false,
    isFallback: true,
    error: null,
  }),
}));

const departmentRecord = {
  id: 'dept-ops',
  name: 'Operations',
  description: 'Ops department',
  manager_id: 'mgr-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
};

const employeeRecord = {
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
  department: departmentRecord,
};

vi.mock('@/hooks/useEmployees', () => ({
  useDepartments: () => ({ data: [departmentRecord], isLoading: false, isError: false, refetch: vi.fn() }),
  useEmployees: () => ({ data: [employeeRecord], isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateDepartment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDepartment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDepartment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/layouts/ModuleLayout', () => {
  const Root = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Header = ({ title }: { title: string }) => <div>{title}</div>;
  const Toolbar = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const DetailDrawer = ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null);

  return {
    ModuleLayout: Object.assign(Root, {
      Header,
      Toolbar,
      Content,
      DetailDrawer,
    }),
  };
});

vi.mock('@/components/system', () => ({
  DataTableShell: ({ content }: { content?: ReactNode }) => <div>{content}</div>,
  QueryErrorState: () => <div>query-error</div>,
  RecordSurfaceHeader: () => null,
}));

vi.mock('@/modules/departments/components/DepartmentTable', () => ({
  DepartmentTable: ({ departments, onOpenDepartment }: { departments: Array<{ id: string }>; onOpenDepartment: (department: { id: string }) => void }) => (
    <button type="button" onClick={() => onOpenDepartment(departments[0])}>open-department</button>
  ),
}));

vi.mock('@/modules/departments/components/DepartmentDetailDrawer', () => ({
  DepartmentDetailDrawer: ({ open, department, tab }: { open: boolean; department: { id: string } | null; tab: string }) =>
    open ? <div>{`drawer:${department?.id}:${tab}`}</div> : null,
}));

vi.mock('@/modules/departments/components/DepartmentManagementDialogs', () => ({
  DepartmentManagementDialogs: () => null,
}));

describe('DepartmentsPage', () => {
  it('opens the detail drawer with the default overview tab from the table surface', () => {
    render(
      <MemoryRouter initialEntries={['/departments']}>
        <DepartmentsPage entryContext="module" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open-department' }));

    expect(screen.getByText('drawer:dept-ops:overview')).toBeInTheDocument();
  });
});
