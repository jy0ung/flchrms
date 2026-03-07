import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Building2, Download, GitBranch, Plus, Upload, UserCircle2, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ADMIN_ROLE_COLORS } from '@/components/admin/admin-ui-constants';
import { BulkActionBar } from '@/components/bulk-actions/BulkActionBar';
import { OrgChart } from '@/components/employees/OrgChart';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments, useEmployees } from '@/hooks/useEmployees';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { DataTableShell } from '@/components/system';
import { WorkspaceMetricStrip } from '@/components/workspace/WorkspaceMetricStrip';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import type { AppRole, EmployeeStatus } from '@/types/hrms';

import { EmployeeDetailDrawer } from './components/EmployeeDrawer/EmployeeDetailDrawer';
import { EmployeeManagementDialogs } from './components/EmployeeManagementDialogs';
import { EmployeeTable, type DirectoryEmployee } from './components/EmployeeTable';
import { useEmployeeManagementController } from './hooks/useEmployeeManagementController';
import { useEmployeeModuleCapabilities } from './hooks/useEmployeeModuleCapabilities';
import { coerceEmployeeDrawerTab, type EmployeesPageProps } from './types';

function formatRoleLabel(role: AppRole | null | undefined) {
  return role ? role.replace(/_/g, ' ') : 'Unknown';
}

function downloadEmployeesCsv(data: DirectoryEmployee[], allEmployees: DirectoryEmployee[]) {
  if (data.length === 0) {
    return;
  }

  const headers = [
    'employee_id',
    'first_name',
    'last_name',
    'email',
    'username',
    'phone',
    'job_title',
    'department',
    'status',
    'hire_date',
    'manager',
  ];
  const managerLookup = new Map(
    allEmployees.map((employee) => [employee.id, `${employee.first_name} ${employee.last_name}`]),
  );

  const escapeValue = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csvRows = data.map((employee) => [
    employee.employee_id ?? '',
    employee.first_name,
    employee.last_name,
    employee.email,
    employee.username ?? '',
    employee.phone ?? '',
    employee.job_title ?? '',
    employee.department?.name ?? '',
    employee.status,
    employee.hire_date ?? '',
    employee.manager_id ? managerLookup.get(employee.manager_id) ?? employee.manager_id : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...csvRows.map((row) => row.map((value) => escapeValue(String(value))).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `employees_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function EmployeesPage({ entryContext = 'module', adminCapabilitiesOverride }: EmployeesPageProps) {
  usePageTitle(entryContext === 'admin' ? 'Admin · Employees' : 'Employees');

  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewType, setViewType] = useState<'table' | 'org'>('table');
  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles } = useUserRoles();
  const { capabilities, isLoading: capabilitiesLoading, getEditAccessMode, getRowPermissions, pageActions } =
    useEmployeeModuleCapabilities({ adminCapabilitiesOverride });

  const userRoleById = useMemo(
    () => new Map((userRoles ?? []).map((entry) => [entry.user_id, entry.role])),
    [userRoles],
  );

  const getUserRole = useCallback(
    (userId: string): AppRole => userRoleById.get(userId) ?? 'employee',
    [userRoleById],
  );
  const getEmployeeId = useCallback((employee: DirectoryEmployee) => employee.id, []);

  const controller = useEmployeeManagementController({
    getUserRole,
    resolveEditAccessMode: getEditAccessMode,
    resolveRowPermissions: getRowPermissions,
  });

  const filteredEmployees = useMemo(() => {
    const searchText = deferredSearch.trim().toLowerCase();

    return (employees ?? []).filter((employee) => {
      const matchesSearch =
        searchText.length === 0 ||
        `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchText) ||
        employee.email.toLowerCase().includes(searchText) ||
        employee.username?.toLowerCase().includes(searchText) ||
        employee.employee_id?.toLowerCase().includes(searchText) ||
        employee.job_title?.toLowerCase().includes(searchText);

      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || employee.department_id === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [deferredSearch, departmentFilter, employees, statusFilter]);

  const bulkSelection = useBulkSelection(filteredEmployees, getEmployeeId);

  const managerNameById = useMemo(
    () =>
      new Map((employees ?? []).map((employee) => [employee.id, `${employee.first_name} ${employee.last_name}`])),
    [employees],
  );

  const getManagerName = useCallback(
    (managerId: string | null | undefined) => {
      if (!managerId) return null;
      return managerNameById.get(managerId) ?? managerId;
    },
    [managerNameById],
  );

  const drawerEmployeeId = searchParams.get('employeeId');
  const drawerTab = coerceEmployeeDrawerTab(searchParams.get('employeeTab'));

  useEffect(() => {
    if (drawerEmployeeId && drawerTab === 'documents' && !pageActions.canOpenDocumentsTab) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('employeeTab', 'profile');
      setSearchParams(nextParams, { replace: true });
    }
  }, [drawerEmployeeId, drawerTab, pageActions.canOpenDocumentsTab, searchParams, setSearchParams]);

  const updateDrawerParams = useCallback(
    (employeeId: string | null, tab: 'profile' | 'employment' | 'leave' | 'documents' | 'activity' = 'profile') => {
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);

        if (!employeeId) {
          nextParams.delete('employeeId');
          nextParams.delete('employeeTab');
          return nextParams;
        }

        nextParams.set('employeeId', employeeId);
        nextParams.set('employeeTab', tab);
        return nextParams;
      });
    },
    [setSearchParams],
  );

  const handleOpenEmployee = useCallback(
    (employee: DirectoryEmployee) => {
      updateDrawerParams(employee.id, 'profile');
    },
    [updateDrawerParams],
  );

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        updateDrawerParams(null);
      }
    },
    [updateDrawerParams],
  );

  const handleDrawerTabChange = useCallback(
    (tab: 'profile' | 'employment' | 'leave' | 'documents' | 'activity') => {
      if (!drawerEmployeeId) {
        return;
      }
      updateDrawerParams(drawerEmployeeId, tab);
    },
    [drawerEmployeeId, updateDrawerParams],
  );

  const handleExportFiltered = useCallback(() => {
    downloadEmployeesCsv(filteredEmployees, employees ?? []);
  }, [employees, filteredEmployees]);

  const handleExportSelected = useCallback(() => {
    downloadEmployeesCsv(bulkSelection.selectedItems, employees ?? []);
  }, [bulkSelection.selectedItems, employees]);

  const stats = useMemo(() => {
    const total = employees?.length ?? 0;
    const active = employees?.filter((employee) => employee.status === 'active').length ?? 0;
    const onLeave = employees?.filter((employee) => employee.status === 'on_leave').length ?? 0;
    const departmentCount = new Set((employees ?? []).map((employee) => employee.department_id).filter(Boolean)).size;

    return {
      total,
      active,
      onLeave,
      departmentCount,
    };
  }, [employees]);

  if (entryContext === 'admin' && capabilitiesLoading && !adminCapabilitiesOverride) {
    return null;
  }

  if (entryContext === 'admin' && !capabilities.canManageEmployeeProfiles) {
    return (
      <AdminAccessDenied
        title="Employee management is disabled"
        description="Your account does not have the capability to manage employee records."
      />
    );
  }

  const toolbarActions = (
    <div className="flex flex-wrap gap-2">
      {pageActions.canCreateEmployee ? (
        <Button className="h-9 rounded-full" onClick={controller.openCreateEmployeeDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      ) : null}

      {pageActions.canImportEmployees ? (
        <Button variant="outline" className="h-9 rounded-full" onClick={() => setBatchUpdateDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      ) : null}

      {pageActions.canExportEmployees ? (
        <Button variant="outline" className="h-9 rounded-full" onClick={handleExportFiltered}>
          <Download className="mr-2 h-4 w-4" />
          Export Filtered
        </Button>
      ) : null}
    </div>
  );

  return (
    <ModuleLayout maxWidth="7xl">
      <ModuleLayout.Header
        eyebrow={entryContext === 'admin' ? 'Admin Workspace' : 'Module Workspace'}
        title="Employee Directory"
        description="Contextual employee management is now anchored in the employee module."
        metaSlot={
          <>
            <Button variant="outline" size="sm" className="rounded-full px-3 text-xs capitalize" disabled>
              Viewer role: {formatRoleLabel(role)}
            </Button>
            {entryContext === 'admin' ? (
              <Button variant="outline" size="sm" className="rounded-full px-3 text-xs" disabled>
                Admin wrapper
              </Button>
            ) : null}
          </>
        }
      />

      <ModuleLayout.Toolbar
        density="compact"
        ariaLabel="Employee workspace controls"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search employees...',
          ariaLabel: 'Search employees',
          inputProps: { className: 'h-9 rounded-full' },
        }}
        filters={[
          {
            id: 'employee-status-filter',
            label: 'Status',
            minWidthClassName: 'sm:min-w-[160px]',
            control: (
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as EmployeeStatus | 'all')}>
                <SelectTrigger className="h-9 rounded-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            ),
          },
          {
            id: 'employee-department-filter',
            label: 'Department',
            minWidthClassName: 'sm:min-w-[180px]',
            control: (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 rounded-full">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          },
        ]}
        actions={toolbarActions}
        trailingSlot={
          <ToggleGroup
            type="single"
            value={viewType}
            onValueChange={(value) => value && setViewType(value as 'table' | 'org')}
            className="w-full justify-end md:w-auto"
            aria-label="Employee workspace view"
          >
            <ToggleGroupItem value="table" aria-label="Table view" className="rounded-full">
              <Users className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="org" aria-label="Org chart view" className="rounded-full">
              <GitBranch className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        }
      >
        {pageActions.canBulkActions ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{filteredEmployees.length} filtered record{filteredEmployees.length === 1 ? '' : 's'}</span>
              <span aria-hidden="true">.</span>
              <span>{bulkSelection.selectedCount} selected</span>
            </div>
            <BulkActionBar
              items={filteredEmployees}
              selectedIds={bulkSelection.selectedIds}
              getItemId={getEmployeeId}
              actions={[
                {
                  id: 'export-selected',
                  label: 'Export Selected',
                  icon: Download,
                  onExecute: () => handleExportSelected(),
                },
                {
                  id: 'open-csv-batch-update',
                  label: 'CSV Batch Update',
                  icon: Upload,
                  onExecute: () => setBatchUpdateDialogOpen(true),
                },
              ]}
              onClearSelection={bulkSelection.clearSelection}
            />
          </div>
        ) : null}
      </ModuleLayout.Toolbar>

      <ModuleLayout.Content>
        <WorkspaceMetricStrip
          items={[
            {
              id: 'total-employees',
              label: 'Total employees',
              value: stats.total,
              description: 'Visible across the current directory workspace.',
              icon: Users,
            },
            {
              id: 'active-employees',
              label: 'Active',
              value: stats.active,
              description: 'Employees currently marked active.',
              icon: UserCircle2,
              tone: 'success',
            },
            {
              id: 'employees-on-leave',
              label: 'On leave',
              value: stats.onLeave,
              description: 'Employees currently unavailable.',
              icon: Users,
              tone: 'warning',
            },
            {
              id: 'covered-departments',
              label: 'Departments',
              value: stats.departmentCount,
              description: 'Distinct departments represented in the directory.',
              icon: Building2,
              tone: 'info',
            },
          ]}
        />

        {viewType === 'org' ? (
          <DataTableShell
            density="compact"
            title="Organization Chart"
            description="Read-only hierarchy view for the employee directory."
            content={<OrgChart />}
          />
        ) : (
          <DataTableShell
            density="compact"
            title="Employees"
            description={`${filteredEmployees.length} result${filteredEmployees.length === 1 ? '' : 's'} in the current workspace view`}
            content={
              <EmployeeTable
                employees={filteredEmployees}
                loading={employeesLoading}
                selectedIds={bulkSelection.selectedIds}
                onSelectedIdsChange={bulkSelection.setSelectedIds}
                onOpenEmployee={handleOpenEmployee}
                getUserRole={getUserRole}
                roleColors={ADMIN_ROLE_COLORS}
                canSelectRows={pageActions.canBulkActions}
                canViewSensitiveIdentifiers={pageActions.canViewSensitiveIdentifiers}
              />
            }
          />
        )}
      </ModuleLayout.Content>

      <EmployeeDetailDrawer
        employeeId={drawerEmployeeId}
        open={!!drawerEmployeeId}
        onOpenChange={handleDrawerOpenChange}
        tab={drawerTab}
        onTabChange={handleDrawerTabChange}
        getUserRole={getUserRole}
        roleColors={ADMIN_ROLE_COLORS}
        getManagerName={getManagerName}
        adminCapabilitiesOverride={adminCapabilitiesOverride}
        onEditProfile={controller.handleEditProfile}
        onResetPassword={controller.openResetPasswordDialog}
        onEditRole={controller.handleEditRole}
        onArchiveEmployee={controller.handleArchiveEmployee}
        onRestoreEmployee={controller.handleRestoreEmployee}
      />

      <EmployeeManagementDialogs
        controller={controller}
        departments={departments}
        employees={employees}
        getUserRole={getUserRole}
        batchUpdateDialogOpen={batchUpdateDialogOpen}
        onBatchUpdateDialogOpenChange={setBatchUpdateDialogOpen}
      />
    </ModuleLayout>
  );
}
