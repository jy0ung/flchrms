import { useDeferredValue, useMemo, useState } from 'react';
import { ADMIN_ROLE_COLORS, getDefaultAdminTabForRole, type AdminTabKey } from '@/components/admin/admin-ui-constants';
import type { AppRole, Department, EmployeeStatus, Profile } from '@/types/hrms';

type UserRoleAssignment = {
  user_id: string;
  role: AppRole;
};

interface UseAdminPageViewModelParams {
  role: AppRole | null | undefined;
  employees?: Profile[];
  departments?: Department[];
  userRoles?: UserRoleAssignment[];
}

export function useAdminPageViewModel({
  role,
  employees,
  departments,
  userRoles,
}: UseAdminPageViewModelParams) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departmentSearch, setDepartmentSearch] = useState('');

  const deferredSearch = useDeferredValue(search);
  const deferredDepartmentSearch = useDeferredValue(departmentSearch);

  const filteredEmployeesBySearch = useMemo(() => {
    const searchText = deferredSearch.toLowerCase();
    return employees?.filter((employee) => (
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchText) ||
      employee.email.toLowerCase().includes(searchText) ||
      employee.employee_id?.toLowerCase().includes(searchText) ||
      employee.username?.toLowerCase().includes(searchText)
    ));
  }, [deferredSearch, employees]);

  const filteredEmployees = useMemo(() => {
    return filteredEmployeesBySearch?.filter((employee) => {
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || employee.department_id === departmentFilter;
      return matchesStatus && matchesDepartment;
    });
  }, [departmentFilter, filteredEmployeesBySearch, statusFilter]);

  const filteredDepartments = useMemo(() => {
    const searchText = deferredDepartmentSearch.toLowerCase();
    return departments?.filter((department) => (
      department.name.toLowerCase().includes(searchText) ||
      (department.description || '').toLowerCase().includes(searchText)
    ));
  }, [departments, deferredDepartmentSearch]);

  const userRoleByUserId = useMemo(() => {
    return new Map((userRoles ?? []).map((entry) => [entry.user_id, entry.role]));
  }, [userRoles]);

  const getUserRole = (userId: string): AppRole => userRoleByUserId.get(userId) ?? 'employee';

  const stats = useMemo(() => ({
    totalEmployees: employees?.length || 0,
    admins: userRoles?.filter((r) => r.role === 'admin').length || 0,
    hrUsers: userRoles?.filter((r) => r.role === 'hr').length || 0,
    managers: userRoles?.filter((r) => r.role === 'manager').length || 0,
  }), [employees, userRoles]);

  const defaultAdminTab: AdminTabKey = getDefaultAdminTabForRole(role);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    departmentSearch,
    setDepartmentSearch,
    filteredEmployeesBySearch,
    filteredEmployees,
    filteredDepartments,
    getUserRole,
    roleColors: ADMIN_ROLE_COLORS,
    stats,
    defaultAdminTab,
  };
}
