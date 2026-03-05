import { useEmployees } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Table, 
  TableBody, 
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Mail, Building, LayoutGrid, List, UserCircle, GitBranch } from 'lucide-react';
import { OrgChart } from '@/components/employees/OrgChart';
import { useDeferredValue, useMemo, useState, type KeyboardEvent } from 'react';
import { Profile, Department, AppRole } from '@/types/hrms';
import { AppPageContainer, CardHeaderStandard, DataTableShell, PageHeader, SectionToolbar, StatusBadge } from '@/components/system';

export default function Employees() {
  usePageTitle('Employees');
  const { role: viewerRole } = useAuth();
  const { data: employees, isLoading } = useEmployees();
  const { data: userRoles } = useUserRoles();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [viewType, setViewType] = useState<'grid' | 'list' | 'org'>('grid');

  const filteredEmployees = employees?.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(deferredSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(deferredSearch.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(deferredSearch.toLowerCase())
  );

  const [deptFilter, setDeptFilter] = useState<string>('all');

  const departments = useMemo(() => {
    if (!employees) return [];
    const deptSet = new Map<string, string>();
    for (const e of employees) {
      if (e.department) deptSet.set(e.department.id, e.department.name);
    }
    return Array.from(deptSet.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [employees]);

  const displayedEmployees = useMemo(() => {
    if (!filteredEmployees) return [];
    if (deptFilter === 'all') return filteredEmployees;
    return filteredEmployees.filter((e) => e.department_id === deptFilter);
  }, [filteredEmployees, deptFilter]);

  const stats = useMemo(() => {
    if (!employees) return { total: 0, active: 0, onLeave: 0, departments: 0 };
    return {
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      onLeave: employees.filter((e) => e.status === 'on_leave').length,
      departments: new Set(employees.map((e) => e.department_id).filter(Boolean)).size,
    };
  }, [employees]);

  const getUserRole = (userId: string): AppRole => {
    const userRole = userRoles?.find(ur => ur.user_id === userId);
    return userRole?.role || 'employee';
  };

  const formatRoleLabel = (value: AppRole) => value.replace(/_/g, ' ');

  const roleColors: Record<AppRole, string> = {
    admin: 'bg-rose-50 text-rose-800 border-rose-200',
    hr: 'bg-violet-50 text-violet-800 border-violet-200',
    director: 'bg-amber-50 text-amber-800 border-amber-200',
    general_manager: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    manager: 'bg-blue-50 text-blue-800 border-blue-200',
    employee: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const handleEmployeeClick = (employee: Profile & { department: Department | null }) => {
    navigate(`/employees/${employee.id}`);
  };

  const handleEmployeeKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    employee: Profile & { department: Department | null },
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleEmployeeClick(employee);
    }
  };

  const LoadingGridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="border-border shadow-sm">
          <CardContent className="pt-4">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const LoadingListSkeleton = () => (
    <Card className="border-border shadow-sm">
      <CardContent className="pt-4">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppPageContainer maxWidth="7xl">
      <PageHeader
        title="Employee Directory"
        description={`${employees?.length || 0} employees`}
        toolbarSlot={
          <SectionToolbar
            density="compact"
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search employees...',
              ariaLabel: 'Search employees',
              inputProps: { className: 'h-9 rounded-full' },
            }}
            filters={departments.length > 1 ? [
              {
                id: 'dept-filter',
                label: 'Department',
                control: (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="h-9 rounded-full border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                ),
              },
            ] : undefined}
            trailingSlot={
              <ToggleGroup
                type="single"
                value={viewType}
                onValueChange={(value) => value && setViewType(value as 'grid' | 'list' | 'org')}
                className="w-full justify-end md:w-auto"
                aria-label="Employee directory view type"
              >
                <ToggleGroupItem value="grid" aria-label="Grid view" className="rounded-full">
                  <LayoutGrid className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view" className="rounded-full">
                  <List className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="org" aria-label="Org chart view" className="rounded-full">
                  <GitBranch className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            }
          />
        }
      />

      {/* Stats bar */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Employees', value: stats.total, icon: Users },
            { label: 'Active', value: stats.active, icon: UserCircle },
            { label: 'On Leave', value: stats.onLeave, icon: Users },
            { label: 'Departments', value: stats.departments, icon: Building },
          ].map((s) => (
            <Card key={s.label} className="border-border shadow-sm">
              <CardContent className="flex items-center gap-3 p-3">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewType === 'org' ? (
        <OrgChart />
      ) : isLoading ? (
        viewType === 'grid' ? <LoadingGridSkeleton /> : <LoadingListSkeleton />
      ) : (
        <DataTableShell
          title={viewType === 'grid' ? 'Employees' : 'Employee List'}
          description={`${displayedEmployees.length} result${displayedEmployees.length === 1 ? '' : 's'}`}
          hasData={displayedEmployees.length > 0}
          emptyState={
            <div className="text-center py-12 text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>No employees match your search.</p>
            </div>
          }
          content={
            viewType === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedEmployees.map((employee) => (
                  <Card
                    key={employee.id}
                    className="cursor-pointer border-border shadow-sm transition-all hover:border-accent/50 hover:shadow-md"
                    onClick={() => handleEmployeeClick(employee)}
                    onKeyDown={(event) => handleEmployeeKeyDown(event, employee)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View employee details for ${employee.first_name} ${employee.last_name}`}
                  >
                    <CardHeaderStandard
                      title={`${employee.first_name} ${employee.last_name}`}
                      description={employee.job_title || 'No title'}
                      className="p-4 pb-2"
                      titleClassName="text-base font-semibold"
                      descriptionClassName="truncate text-sm"
                      actions={<StatusBadge status={employee.status} />}
                    />
                    <CardContent className="pt-0">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Mail className="w-3 h-3" /> {employee.email}
                            </p>
                            {employee.department && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Building className="w-3 h-3" /> {employee.department.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {displayedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="rounded-lg border border-border p-4 shadow-sm cursor-pointer"
                      onClick={() => handleEmployeeClick(employee)}
                      onKeyDown={(event) => handleEmployeeKeyDown(event, employee)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View employee details for ${employee.first_name} ${employee.last_name}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {employee.first_name} {employee.last_name}
                            </p>
                            <StatusBadge status={employee.status} />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className={roleColors[getUserRole(employee.id)]}>
                              {formatRoleLabel(getUserRole(employee.id))}
                            </Badge>
                            <Badge variant="outline">
                              {employee.department?.name || 'No Department'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedEmployees.map((employee) => (
                        <TableRow
                          key={employee.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleEmployeeClick(employee)}
                          onKeyDown={(event) => handleEmployeeKeyDown(event, employee)}
                          role="button"
                          tabIndex={0}
                          aria-label={`View employee details for ${employee.first_name} ${employee.last_name}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {employee.first_name[0]}{employee.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{employee.department?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={roleColors[getUserRole(employee.id)]}>
                              {formatRoleLabel(getUserRole(employee.id))}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={employee.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )
          }
        />
      )}

    </AppPageContainer>
  );
}
