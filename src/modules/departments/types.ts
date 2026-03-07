import type { AdminCapabilities } from '@/lib/admin-permissions';
import type { Department, Profile } from '@/types/hrms';

export type DepartmentDrawerTab = 'overview' | 'members' | 'manager' | 'activity';

export interface DepartmentsPageProps {
  entryContext?: 'module' | 'admin';
  adminCapabilitiesOverride?: AdminCapabilities;
}

export interface DepartmentPageActionPermissions {
  canManageDepartments: boolean;
  canCreateDepartment: boolean;
  canViewSensitiveIdentifiers: boolean;
}

export interface DepartmentRowActionPermissions {
  canOpenDrawer: boolean;
  canEditDepartment: boolean;
  canDeleteDepartment: boolean;
}

export interface DepartmentDrawerState {
  departmentId: string | null;
  tab: DepartmentDrawerTab;
}

export type DepartmentEmployee = Profile & { department: Department | null };

export interface DepartmentRecord extends Department {
  memberCount: number;
  members: DepartmentEmployee[];
  manager: DepartmentEmployee | null;
}

export function coerceDepartmentDrawerTab(value: string | null | undefined): DepartmentDrawerTab {
  switch (value) {
    case 'members':
    case 'manager':
    case 'activity':
      return value;
    case 'overview':
    default:
      return 'overview';
  }
}
