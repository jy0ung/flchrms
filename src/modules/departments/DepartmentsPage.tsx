import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Building2, FolderTree, Plus, UserSquare2, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { QueryErrorState } from '@/components/system';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ModuleLayout } from '@/layouts/ModuleLayout';

import { DepartmentDetailDrawer } from './components/DepartmentDetailDrawer';
import { DepartmentManagementDialogs } from './components/DepartmentManagementDialogs';
import { DepartmentTable } from './components/DepartmentTable';
import { useDepartmentManagementController } from './hooks/useDepartmentManagementController';
import { useDepartmentModuleCapabilities } from './hooks/useDepartmentModuleCapabilities';
import { coerceDepartmentDrawerTab, type DepartmentsPageProps, type DepartmentRecord } from './types';

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Building2 }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DepartmentsPage({ entryContext = 'module', adminCapabilitiesOverride }: DepartmentsPageProps) {
  usePageTitle(entryContext === 'admin' ? 'Admin · Departments' : 'Departments');

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [searchParams, setSearchParams] = useSearchParams();

  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees();
  const { pageActions, getRowPermissions, capabilities, isLoading: capabilitiesLoading } =
    useDepartmentModuleCapabilities({ adminCapabilitiesOverride });
  const controller = useDepartmentManagementController();

  const departmentRecords = useMemo<DepartmentRecord[]>(() => {
    const employees = employeesQuery.data ?? [];

    return (departmentsQuery.data ?? []).map((department) => {
      const members = employees.filter((employee) => employee.department_id === department.id);
      const manager = employees.find((employee) => employee.id === department.manager_id) ?? null;

      return {
        ...department,
        members,
        memberCount: members.length,
        manager,
      };
    });
  }, [departmentsQuery.data, employeesQuery.data]);

  const filteredDepartments = useMemo(() => {
    const searchText = deferredSearch.trim().toLowerCase();
    if (!searchText) return departmentRecords;

    return departmentRecords.filter((department) => {
      const managerName = department.manager
        ? `${department.manager.first_name} ${department.manager.last_name}`.toLowerCase()
        : '';

      return (
        department.name.toLowerCase().includes(searchText) ||
        (department.description || '').toLowerCase().includes(searchText) ||
        managerName.includes(searchText)
      );
    });
  }, [deferredSearch, departmentRecords]);

  const drawerDepartmentId = searchParams.get('departmentId');
  const drawerTab = coerceDepartmentDrawerTab(searchParams.get('departmentTab'));

  const selectedDepartment = useMemo(
    () => departmentRecords.find((department) => department.id === drawerDepartmentId) ?? null,
    [departmentRecords, drawerDepartmentId],
  );

  const isLoading = departmentsQuery.isLoading || employeesQuery.isLoading;
  const isUnavailable = Boolean(drawerDepartmentId) && !selectedDepartment && !isLoading;
  const selectedPermissions = selectedDepartment
    ? getRowPermissions({ memberCount: selectedDepartment.memberCount })
    : null;

  const updateDrawerParams = useCallback(
    (departmentId: string | null, tab: 'overview' | 'members' | 'manager' | 'activity' = 'overview') => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);

        if (!departmentId) {
          next.delete('departmentId');
          next.delete('departmentTab');
          return next;
        }

        next.set('departmentId', departmentId);
        next.set('departmentTab', tab);
        return next;
      });
    },
    [setSearchParams],
  );

  const handleOpenDepartment = useCallback(
    (department: DepartmentRecord) => {
      if (!getRowPermissions({ memberCount: department.memberCount }).canOpenDrawer) return;
      updateDrawerParams(department.id, 'overview');
    },
    [getRowPermissions, updateDrawerParams],
  );

  const stats = useMemo(() => {
    const totalDepartments = departmentRecords.length;
    const staffedDepartments = departmentRecords.filter((department) => department.memberCount > 0).length;
    const assignedManagers = departmentRecords.filter((department) => department.manager_id).length;
    const unassignedEmployees = (employeesQuery.data ?? []).filter((employee) => !employee.department_id).length;

    return {
      totalDepartments,
      staffedDepartments,
      assignedManagers,
      unassignedEmployees,
    };
  }, [departmentRecords, employeesQuery.data]);

  if (capabilitiesLoading && !adminCapabilitiesOverride) {
    return null;
  }

  if (!pageActions.canManageDepartments) {
    return (
      <AdminAccessDenied
        title="Department management is disabled"
        description="Your account does not have the capability to manage departments."
      />
    );
  }

  if (departmentsQuery.isError || employeesQuery.isError) {
    return (
      <QueryErrorState
        label="department workspace"
        onRetry={() => {
          void departmentsQuery.refetch();
          void employeesQuery.refetch();
        }}
      />
    );
  }

  return (
    <ModuleLayout maxWidth="7xl">
      <ModuleLayout.Header
        eyebrow="Module Workspace"
        title="Department Management"
        description="Create, edit, and review departments in context."
        actions={pageActions.canCreateDepartment ? [
          {
            id: 'create-department',
            label: 'Create Department',
            icon: Plus,
            onClick: () => controller.setCreateDeptDialogOpen(true),
            variant: 'default',
          },
        ] : undefined}
      />

      <ModuleLayout.Toolbar
        density="compact"
        ariaLabel="Department workspace controls"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search departments...',
          ariaLabel: 'Search departments',
        }}
        trailingSlot={pageActions.canCreateDepartment ? (
          <Button variant="outline" className="h-9 rounded-full" onClick={() => controller.setCreateDeptDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Department
          </Button>
        ) : null}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{stats.totalDepartments} departments</span>
          <span aria-hidden="true">.</span>
          <span>{stats.staffedDepartments} staffed</span>
          <span aria-hidden="true">.</span>
          <span>{stats.unassignedEmployees} unassigned employees</span>
        </div>
      </ModuleLayout.Toolbar>

      <ModuleLayout.Content>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Departments" value={String(stats.totalDepartments)} icon={Building2} />
          <StatCard title="Staffed Departments" value={String(stats.staffedDepartments)} icon={FolderTree} />
          <StatCard title="Assigned Managers" value={String(stats.assignedManagers)} icon={UserSquare2} />
          <StatCard title="Unassigned Employees" value={String(stats.unassignedEmployees)} icon={Users} />
        </div>

        <DepartmentTable
          departments={filteredDepartments}
          loading={isLoading}
          canViewSensitiveIdentifiers={capabilities.canViewSensitiveEmployeeIdentifiers}
          onOpenDepartment={handleOpenDepartment}
        />
      </ModuleLayout.Content>

      <DepartmentDetailDrawer
        open={Boolean(drawerDepartmentId)}
        onOpenChange={(open) => {
          if (!open) updateDrawerParams(null);
        }}
        department={selectedDepartment}
        loading={isLoading}
        isUnavailable={isUnavailable}
        tab={drawerTab}
        onTabChange={(tab) => updateDrawerParams(drawerDepartmentId, tab)}
        rowPermissions={selectedPermissions}
        onEditDepartment={(department) => controller.handleEditDepartment(department)}
        onDeleteDepartment={(department) => controller.openDeleteDepartmentDialog(department)}
      />

      <DepartmentManagementDialogs controller={controller} />
    </ModuleLayout>
  );
}
