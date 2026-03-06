import type { AdminCapabilities } from '@/lib/admin-permissions';

export type EmployeeDrawerTab =
  | 'profile'
  | 'employment'
  | 'leave'
  | 'documents'
  | 'activity';

export type EmployeeEditAccessMode =
  | 'none'
  | 'manager_limited'
  | 'full'
  | 'alias_only';

export interface EmployeesPageProps {
  entryContext?: 'module' | 'admin';
  adminCapabilitiesOverride?: AdminCapabilities;
}

export interface EmployeeRowActionPermissions {
  editAccessMode: EmployeeEditAccessMode;
  canResetPassword: boolean;
  canManageRole: boolean;
  canArchiveRestore: boolean;
  canOpenDocumentsTab: boolean;
}

export interface EmployeePageActionPermissions {
  canCreateEmployee: boolean;
  canImportEmployees: boolean;
  canBulkActions: boolean;
  canExportEmployees: boolean;
  canViewSensitiveIdentifiers: boolean;
  canOpenDocumentsTab: boolean;
}

export interface EmployeeDrawerState {
  employeeId: string | null;
  tab: EmployeeDrawerTab;
}

export interface EmployeeActivityItem {
  id: string;
  at: string;
  type: 'profile_change' | 'lifecycle';
  title: string;
  description: string | null;
}

const EMPLOYEE_DRAWER_TABS: EmployeeDrawerTab[] = [
  'profile',
  'employment',
  'leave',
  'documents',
  'activity',
];

export function isEmployeeDrawerTab(value: string | null | undefined): value is EmployeeDrawerTab {
  return !!value && EMPLOYEE_DRAWER_TABS.includes(value as EmployeeDrawerTab);
}

export function coerceEmployeeDrawerTab(value: string | null | undefined): EmployeeDrawerTab {
  return isEmployeeDrawerTab(value) ? value : 'profile';
}
