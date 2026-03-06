import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmployeeDetailDrawer } from '@/modules/employees/components/EmployeeDrawer/EmployeeDetailDrawer';

const authState = {
  role: 'hr',
};

const rowPermissionsState = {
  editAccessMode: 'full' as const,
  canResetPassword: true,
  canManageRole: true,
  canArchiveRestore: true,
  canOpenDocumentsTab: true,
};

const useLeaveBalanceSpy = vi.fn();
const useDocumentsSpy = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'hr-1' }, role: authState.role }),
}));

vi.mock('@/modules/employees/hooks/useEmployeeModuleCapabilities', () => ({
  useEmployeeModuleCapabilities: () => ({
    getRowPermissions: () => rowPermissionsState,
  }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployee: () => ({
    data: {
      id: 'emp-1',
      employee_id: 'EMP-001',
      email: 'employee@flchrms.test',
      username: 'employee.one',
      first_name: 'Alicia',
      last_name: 'Tan',
      phone: '+6011111111',
      avatar_url: null,
      department_id: 'dept-1',
      job_title: 'Operations Lead',
      hire_date: '2025-01-01',
      manager_id: null,
      status: 'active',
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
    isLoading: false,
    error: null,
  }),
  useProfileChangeLog: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useEmployeeLifecycle', () => ({
  useEmployeeProfile: () => ({ data: undefined }),
  useEmployeeLifecycle: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useLeaveBalance', () => ({
  useLeaveBalance: (...args: unknown[]) => useLeaveBalanceSpy(...args),
}));

vi.mock('@/hooks/useDocuments', () => ({
  useDocuments: (...args: unknown[]) => useDocumentsSpy(...args),
  useGetDocumentSignedUrl: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/layouts/ModuleLayout', () => {
  const Root = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Header = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Toolbar = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Content = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const DetailDrawer = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

  return {
    ModuleLayout: Object.assign(Root, {
      Header,
      Toolbar,
      Content,
      DetailDrawer,
    }),
  };
});

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/EmployeeDrawerActions', () => ({
  EmployeeDrawerActions: () => null,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/EmployeeDrawerTabs', () => ({
  EmployeeDrawerTabs: () => null,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/tabs/ProfileTab', () => ({
  ProfileTab: () => null,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/tabs/EmploymentTab', () => ({
  EmploymentTab: () => null,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/tabs/LeaveTab', () => ({
  LeaveTab: () => null,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/tabs/DocumentsTab', () => ({
  DocumentsTab: () => null,
}));

vi.mock('@/modules/employees/components/EmployeeDrawer/tabs/ActivityTab', () => ({
  ActivityTab: () => null,
}));

describe('EmployeeDetailDrawer query gating', () => {
  beforeEach(() => {
    authState.role = 'hr';
    rowPermissionsState.canOpenDocumentsTab = true;
    useLeaveBalanceSpy.mockReset().mockReturnValue({ data: [], isLoading: false });
    useDocumentsSpy.mockReset().mockReturnValue({ data: [], isLoading: false });
  });

  it('disables leave and document queries while the drawer is closed', () => {
    render(
      <EmployeeDetailDrawer
        employeeId={null}
        open={false}
        onOpenChange={vi.fn()}
        tab="profile"
        onTabChange={vi.fn()}
        getUserRole={() => 'employee'}
        roleColors={{
          admin: '',
          hr: '',
          director: '',
          general_manager: '',
          manager: '',
          employee: '',
        }}
        getManagerName={() => null}
        onEditProfile={vi.fn()}
        onResetPassword={vi.fn()}
        onEditRole={vi.fn()}
        onArchiveEmployee={vi.fn()}
        onRestoreEmployee={vi.fn()}
      />,
    );

    expect(useLeaveBalanceSpy).toHaveBeenCalledWith(undefined, undefined, { enabled: false });
    expect(useDocumentsSpy).toHaveBeenCalledWith(undefined, { enabled: false });
  });

  it('enables only the leave query on the leave tab', () => {
    render(
      <EmployeeDetailDrawer
        employeeId="emp-1"
        open
        onOpenChange={vi.fn()}
        tab="leave"
        onTabChange={vi.fn()}
        getUserRole={() => 'employee'}
        roleColors={{
          admin: '',
          hr: '',
          director: '',
          general_manager: '',
          manager: '',
          employee: '',
        }}
        getManagerName={() => null}
        onEditProfile={vi.fn()}
        onResetPassword={vi.fn()}
        onEditRole={vi.fn()}
        onArchiveEmployee={vi.fn()}
        onRestoreEmployee={vi.fn()}
      />,
    );

    expect(useLeaveBalanceSpy).toHaveBeenCalledWith('emp-1', undefined, { enabled: true });
    expect(useDocumentsSpy).toHaveBeenCalledWith('emp-1', { enabled: false });
  });

  it('keeps the documents query disabled for roles without document access', () => {
    authState.role = 'manager';
    rowPermissionsState.canOpenDocumentsTab = false;

    render(
      <EmployeeDetailDrawer
        employeeId="emp-1"
        open
        onOpenChange={vi.fn()}
        tab="documents"
        onTabChange={vi.fn()}
        getUserRole={() => 'employee'}
        roleColors={{
          admin: '',
          hr: '',
          director: '',
          general_manager: '',
          manager: '',
          employee: '',
        }}
        getManagerName={() => null}
        onEditProfile={vi.fn()}
        onResetPassword={vi.fn()}
        onEditRole={vi.fn()}
        onArchiveEmployee={vi.fn()}
        onRestoreEmployee={vi.fn()}
      />,
    );

    expect(useDocumentsSpy).toHaveBeenCalledWith('emp-1', { enabled: false });
  });
});
