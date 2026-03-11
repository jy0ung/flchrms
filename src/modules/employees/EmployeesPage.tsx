import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Download, GitBranch, MoreHorizontal, Plus, Upload, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ADMIN_ROLE_COLORS } from '@/components/admin/admin-ui-constants';
import { BulkActionBar } from '@/components/bulk-actions/BulkActionBar';
import { OrgChart } from '@/components/employees/OrgChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useDrawerFocusReturn } from '@/hooks/useDrawerFocusReturn';
import { ContextChip, DataTableShell, RecordSurfaceHeader } from '@/components/system';
import { SummaryRail } from '@/components/workspace/SummaryRail';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import type { AppRole, EmployeeStatus } from '@/types/hrms';

import {
  EmployeeDetailDrawer,
  EmployeeManagementDialogs,
  EmployeeTable,
  EmployeeTablePagination,
  type DirectoryEmployee,
} from './components';
import { useEmployeeManagementController, useEmployeeModuleCapabilities } from './hooks';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const deferredSearch = useDeferredValue(search);
  const { rememberTrigger, restoreFocusElement } = useDrawerFocusReturn();

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

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, departmentFilter, statusFilter, viewType]);

  const bulkSelection = useBulkSelection(filteredEmployees, getEmployeeId);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredEmployees, pageSize]);

  const visibleStart = filteredEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = filteredEmployees.length === 0 ? 0 : Math.min(currentPage * pageSize, filteredEmployees.length);

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
  const commandIntent = searchParams.get('command');

  useEffect(() => {
    if (drawerEmployeeId && drawerTab === 'documents' && !pageActions.canOpenDocumentsTab) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('employeeTab', 'profile');
      setSearchParams(nextParams, { replace: true });
    }
  }, [drawerEmployeeId, drawerTab, pageActions.canOpenDocumentsTab, searchParams, setSearchParams]);

  useEffect(() => {
    if (commandIntent !== 'create') {
      return;
    }

    if (pageActions.canCreateEmployee) {
      controller.openCreateEmployeeDialog();
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete('command');
      return nextParams;
    }, { replace: true });
  }, [commandIntent, controller, pageActions.canCreateEmployee, setSearchParams]);

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
    (employee: DirectoryEmployee, trigger?: HTMLElement | null) => {
      rememberTrigger(trigger);
      updateDrawerParams(employee.id, 'profile');
    },
    [rememberTrigger, updateDrawerParams],
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

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (statusFilter !== 'all') {
      labels.push(`Status: ${statusFilter.replace(/_/g, ' ')}`);
    }

    if (departmentFilter !== 'all') {
      const departmentName = departments?.find((department) => department.id === departmentFilter)?.name ?? 'Unknown department';
      labels.push(`Department: ${departmentName}`);
    }

    return labels;
  }, [departmentFilter, departments, statusFilter]);

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

  return (
    <ModuleLayout maxWidth="7xl">
      <ModuleLayout.Header
        eyebrow={entryContext === 'admin' ? 'Admin Workspace' : 'Module Workspace'}
        title="Employee Directory"
        description="Contextual employee management is now anchored in the employee module."
        metaSlot={
          <>
            <ContextChip className="capitalize">
              Viewer role: {formatRoleLabel(role)}
            </ContextChip>
            {entryContext === 'admin' ? (
              <ContextChip className="hidden sm:inline-flex">
                Admin wrapper
              </ContextChip>
            ) : null}
          </>
        }
      />

      <ModuleLayout.Toolbar
        surfaceVariant="flat"
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
                <SelectTrigger className="h-9 rounded-full" aria-label="Filter employees by status">
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
                <SelectTrigger className="h-9 rounded-full" aria-label="Filter employees by department">
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
        actions={(
          <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
            {pageActions.canCreateEmployee ? (
              <Button className="h-9 rounded-full" onClick={controller.openCreateEmployeeDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            ) : null}

            <div className="hidden md:flex md:flex-wrap md:gap-2">
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

            {(pageActions.canImportEmployees || pageActions.canExportEmployees) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-full md:hidden" aria-label="More employee actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {pageActions.canImportEmployees ? (
                    <DropdownMenuItem onClick={() => setBatchUpdateDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Import employees
                    </DropdownMenuItem>
                  ) : null}
                  {pageActions.canExportEmployees ? (
                    <DropdownMenuItem onClick={handleExportFiltered}>
                      <Download className="mr-2 h-4 w-4" />
                      Export filtered
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        )}
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
        {pageActions.canBulkActions && bulkSelection.selectedCount > 0 ? (
          <div className="space-y-3">
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
        <SummaryRail
          variant="subtle"
          compactBreakpoint="xl"
          items={[
            {
              id: 'total-employees',
              label: 'Total employees',
              value: stats.total,
              helper: 'Visible across the current directory workspace.',
            },
            {
              id: 'active-employees',
              label: 'Active',
              value: stats.active,
              helper: 'Employees currently marked active.',
            },
            {
              id: 'employees-on-leave',
              label: 'On leave',
              value: stats.onLeave,
              helper: 'Employees currently unavailable.',
            },
            {
              id: 'covered-departments',
              label: 'Departments',
              value: stats.departmentCount,
              helper: 'Distinct departments represented in the directory.',
            },
          ]}
        />

        <RecordSurfaceHeader
          title={viewType === 'org' ? 'Organization Chart' : 'Employees'}
          description={
            viewType === 'org'
              ? 'Read-only hierarchy view for the employee directory.'
              : 'Filtered directory records in the current workspace view.'
          }
          meta={(
            <>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                {viewType === 'org'
                  ? `${filteredEmployees.length} result${filteredEmployees.length === 1 ? '' : 's'}`
                  : filteredEmployees.length === 0
                    ? '0 results'
                    : `${visibleStart}-${visibleEnd} of ${filteredEmployees.length}`}
              </Badge>
              {pageActions.canBulkActions ? (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {bulkSelection.selectedCount} selected
                </Badge>
              ) : null}
              <Badge variant="outline" className="hidden rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] md:inline-flex">
                {viewType === 'org' ? 'Org chart view' : 'Table view'}
              </Badge>
              {activeFilterLabels.length > 0 ? (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] md:hidden">
                  {activeFilterLabels.length} filter{activeFilterLabels.length === 1 ? '' : 's'}
                </Badge>
              ) : null}
              {activeFilterLabels.map((label) => (
                <Badge key={label} variant="outline" className="hidden rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] md:inline-flex">
                  {label}
                </Badge>
              ))}
            </>
          )}
        />

        {viewType === 'org' ? (
          <DataTableShell
            surfaceVariant="flat"
            density="compact"
            content={<OrgChart />}
          />
        ) : (
          <DataTableShell
            surfaceVariant="flat"
            density="compact"
            content={
              <EmployeeTable
                employees={pagedEmployees}
                loading={employeesLoading}
                selectedIds={bulkSelection.selectedIds}
                onSelectedIdsChange={bulkSelection.setSelectedIds}
                onOpenEmployee={handleOpenEmployee}
                getUserRole={getUserRole}
                roleColors={ADMIN_ROLE_COLORS}
                canSelectRows={pageActions.canBulkActions}
                canViewSensitiveIdentifiers={pageActions.canViewSensitiveIdentifiers}
                embedded
              />
            }
            pagination={(
              <EmployeeTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredEmployees.length}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                onPageChange={setCurrentPage}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setCurrentPage(1);
                }}
              />
            )}
          />
        )}
      </ModuleLayout.Content>

      <EmployeeDetailDrawer
        employeeId={drawerEmployeeId}
        open={!!drawerEmployeeId}
        onOpenChange={handleDrawerOpenChange}
        tab={drawerTab}
        onTabChange={handleDrawerTabChange}
        restoreFocusElement={restoreFocusElement}
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
