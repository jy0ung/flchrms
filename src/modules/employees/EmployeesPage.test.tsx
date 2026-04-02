import { fireEvent, render, screen } from '@testing-library/react';
import { cloneElement, isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { EmployeesPage } from '@/modules/employees/EmployeesPage';

const openCreateEmployeeDialog = vi.fn();
const capabilityState = {
  canAccessAdminPage: true,
  canViewAdminDashboard: true,
  canViewAdminQuickActions: true,
  canViewAdminAuditLog: false,
  canManageEmployeeProfiles: true,
  canCreateEmployee: true,
  canManageDepartments: false,
  canManageLeaveTypes: false,
  canManageAnnouncements: false,
  canManageRoles: true,
  canResetEmployeePasswords: true,
  canManageAdminSettings: false,
  canOpenAccountProfileEditor: true,
  isAdminLimitedProfileEditor: false,
  canViewSensitiveEmployeeIdentifiers: true,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'hr-1' }, role: 'hr' }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: () => undefined,
}));

vi.mock('@/hooks/admin/useAdminCapabilities', () => ({
  useAdminPageCapabilities: () => ({
    capabilities: capabilityState,
    isLoading: false,
    capabilityMap: {},
    isError: false,
    isFallback: true,
    error: null,
  }),
}));

const employeeRecord = {
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
  hire_date: '2025-02-20',
  manager_id: null,
  status: 'active' as const,
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
};

const employeesData = [employeeRecord];
const departmentsData = [employeeRecord.department];
const userRolesData = [{ user_id: 'user-1', role: 'employee' as const }];

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({ isLoading: false, data: employeesData }),
  useDepartments: () => ({ data: departmentsData }),
  useUpdateProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateEmployee: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdminResetUserPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useUserRoles: () => ({ data: userRolesData }),
  useUpdateUserRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteUserRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/layouts/ModuleLayout', () => {
  const Root = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Header = ({
    title,
    actionsSlot,
  }: {
    title: string;
    actionsSlot?: ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {actionsSlot}
    </div>
  );
  const Toolbar = ({
    children,
    actions,
    trailingSlot,
  }: {
    children?: ReactNode;
    actions?: ReactNode;
    trailingSlot?: ReactNode;
  }) => (
    <div>
      {actions}
      {trailingSlot}
      {children}
    </div>
  );
  const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const DetailDrawer = ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null;

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
  DataTableShell: ({ content }: { content: ReactNode }) => <div>{content}</div>,
  RecordSurfaceHeader: ({ title }: { title: string }) => <div>{`record-surface:${title}`}</div>,
  ContextChip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PermissionAction: ({
    allowed,
    children,
  }: {
    allowed: boolean;
    children: ReactNode;
  }) => {
    if (allowed || !isValidElement(children)) return <>{children}</>;
    return cloneElement(children, { disabled: true });
  },
}));

vi.mock('@/components/workspace/SummaryRail', () => ({
  SummaryRail: () => <div>summary-rail</div>,
}));

vi.mock('@/components/employees/OrgChart', () => ({
  OrgChart: () => <div>org-chart</div>,
}));

vi.mock('@/modules/employees/components/EmployeeTable', () => ({
  EmployeeTable: ({ employees, onOpenEmployee }: { employees: Array<typeof employeeRecord>; onOpenEmployee: (employee: typeof employeeRecord) => void }) => (
    <button type="button" onClick={() => onOpenEmployee(employees[0])}>
      open-employee
    </button>
  ),
}));

vi.mock('@/modules/employees/components/EmployeeManagementDialogs', () => ({
  EmployeeManagementDialogs: () => null,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/EmployeeDetailDrawer', () => ({
  EmployeeDetailDrawer: ({ open, employeeId, tab }: { open: boolean; employeeId: string | null; tab: string }) =>
    open ? <div>{`drawer:${employeeId}:${tab}`}</div> : null,
}));

vi.mock('@/modules/employees/hooks/useEmployeeManagementController', () => ({
  useEmployeeManagementController: () => ({
    openCreateEmployeeDialog,
    handleEditProfile: vi.fn(),
    openResetPasswordDialog: vi.fn(),
    handleEditRole: vi.fn(),
    handleArchiveEmployee: vi.fn(),
    handleRestoreEmployee: vi.fn(),
  }),
}));

describe('EmployeesPage', () => {
  beforeEach(() => {
    capabilityState.canManageEmployeeProfiles = true;
    capabilityState.canCreateEmployee = true;
    capabilityState.isAdminLimitedProfileEditor = false;
    capabilityState.canViewSensitiveEmployeeIdentifiers = true;
    openCreateEmployeeDialog.mockClear();
  });

  it('places the directory record context ahead of the summary rail', () => {
    render(
      <MemoryRouter initialEntries={['/employees']}>
        <EmployeesPage entryContext="module" />
      </MemoryRouter>,
    );

    const recordSurface = screen.getByText('record-surface:Employees');
    const summaryRail = screen.getByText('summary-rail');

    expect(
      recordSurface.compareDocumentPosition(summaryRail) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('opens the detail drawer with the default profile tab from the table surface', () => {
    render(
      <MemoryRouter initialEntries={['/employees']}>
        <EmployeesPage entryContext="module" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open-employee' }));

    expect(screen.getByText('drawer:user-1:profile')).toBeInTheDocument();
  });

  it('opens the create employee dialog from a routed command intent', () => {
    render(
      <MemoryRouter initialEntries={['/employees?command=create']}>
        <EmployeesPage entryContext="module" />
      </MemoryRouter>,
    );

    expect(openCreateEmployeeDialog).toHaveBeenCalledTimes(1);
  });

  it('shows disabled employee administration actions with a reason in admin read-only mode', () => {
    capabilityState.canManageEmployeeProfiles = true;
    capabilityState.canCreateEmployee = true;
    capabilityState.isAdminLimitedProfileEditor = true;

    render(
      <MemoryRouter initialEntries={['/admin/employees']}>
        <EmployeesPage entryContext="admin" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /add employee/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^import$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export filtered/i })).toBeDisabled();
    expect(screen.getByText(/read-only directory actions/i)).toBeInTheDocument();
  });
});
