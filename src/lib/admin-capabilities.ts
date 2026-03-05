import type { AppRole } from '@/types/hrms';

export type AdminCapabilityKey =
  | 'access_admin_console'
  | 'view_admin_dashboard'
  | 'view_admin_quick_actions'
  | 'view_admin_audit_log'
  | 'manage_employee_directory'
  | 'create_employee'
  | 'reset_employee_passwords'
  | 'manage_departments'
  | 'manage_roles'
  | 'manage_leave_policies'
  | 'manage_announcements'
  | 'manage_admin_settings'
  | 'view_sensitive_employee_identifiers';

export type AdminCapabilityMap = Record<AdminCapabilityKey, boolean>;

export const ADMIN_CAPABILITY_KEYS: AdminCapabilityKey[] = [
  'access_admin_console',
  'view_admin_dashboard',
  'view_admin_quick_actions',
  'view_admin_audit_log',
  'manage_employee_directory',
  'create_employee',
  'reset_employee_passwords',
  'manage_departments',
  'manage_roles',
  'manage_leave_policies',
  'manage_announcements',
  'manage_admin_settings',
  'view_sensitive_employee_identifiers',
];

export const APP_ROLE_ORDER: AppRole[] = [
  'admin',
  'hr',
  'director',
  'general_manager',
  'manager',
  'employee',
];

export const ADMIN_LOCKED_CAPABILITIES: ReadonlyArray<{ role: AppRole; capability: AdminCapabilityKey }> = [
  { role: 'admin', capability: 'access_admin_console' },
  { role: 'admin', capability: 'manage_roles' },
];

export const ADMIN_CAPABILITY_META: Record<
  AdminCapabilityKey,
  {
    label: string;
    description: string;
  }
> = {
  access_admin_console: {
    label: 'Admin Console Access',
    description: 'Can enter the /admin module and view admin navigation.',
  },
  view_admin_dashboard: {
    label: 'View Admin Dashboard',
    description: 'Can open admin dashboard analytics and system overview widgets.',
  },
  view_admin_quick_actions: {
    label: 'View Quick Actions',
    description: 'Can open admin quick-actions page and use allowed actions.',
  },
  view_admin_audit_log: {
    label: 'View Audit Log',
    description: 'Can open governance and workflow activity audit surfaces.',
  },
  manage_employee_directory: {
    label: 'Manage Employee Directory',
    description: 'Can open employee admin page and edit/manage employee records.',
  },
  create_employee: {
    label: 'Create Employee',
    description: 'Can register new employee accounts via admin create flow.',
  },
  reset_employee_passwords: {
    label: 'Reset Employee Passwords',
    description: 'Can reset employee passwords from admin employee management.',
  },
  manage_departments: {
    label: 'Manage Departments',
    description: 'Can create/update/delete departments in admin module.',
  },
  manage_roles: {
    label: 'Manage Roles',
    description: 'Can assign and modify user roles.',
  },
  manage_leave_policies: {
    label: 'Manage Leave Policies',
    description: 'Can manage leave types and leave workflow builders.',
  },
  manage_announcements: {
    label: 'Manage Announcements',
    description: 'Can create/edit/delete company announcements from admin.',
  },
  manage_admin_settings: {
    label: 'Manage Admin Settings',
    description: 'Can update tenant branding and admin-level settings.',
  },
  view_sensitive_employee_identifiers: {
    label: 'View Sensitive Identifiers',
    description: 'Can view non-masked employee identifiers in admin employee views.',
  },
};

const ALL_TRUE_CAPABILITIES: AdminCapabilityMap = {
  access_admin_console: true,
  view_admin_dashboard: true,
  view_admin_quick_actions: true,
  view_admin_audit_log: true,
  manage_employee_directory: true,
  create_employee: true,
  reset_employee_passwords: true,
  manage_departments: true,
  manage_roles: true,
  manage_leave_policies: true,
  manage_announcements: true,
  manage_admin_settings: true,
  view_sensitive_employee_identifiers: true,
};

const ALL_FALSE_CAPABILITIES: AdminCapabilityMap = {
  access_admin_console: false,
  view_admin_dashboard: false,
  view_admin_quick_actions: false,
  view_admin_audit_log: false,
  manage_employee_directory: false,
  create_employee: false,
  reset_employee_passwords: false,
  manage_departments: false,
  manage_roles: false,
  manage_leave_policies: false,
  manage_announcements: false,
  manage_admin_settings: false,
  view_sensitive_employee_identifiers: false,
};

const DEFAULT_CAPABILITY_MATRIX: Record<AppRole, AdminCapabilityMap> = {
  admin: { ...ALL_TRUE_CAPABILITIES },
  hr: {
    ...ALL_TRUE_CAPABILITIES,
    manage_roles: false,
  },
  director: {
    ...ALL_TRUE_CAPABILITIES,
    reset_employee_passwords: false,
    manage_admin_settings: false,
  },
  general_manager: {
    ...ALL_FALSE_CAPABILITIES,
    access_admin_console: true,
    view_admin_dashboard: true,
    view_admin_quick_actions: true,
    manage_employee_directory: true,
    create_employee: true,
    view_sensitive_employee_identifiers: true,
  },
  manager: { ...ALL_FALSE_CAPABILITIES },
  employee: { ...ALL_FALSE_CAPABILITIES },
};

export function getDefaultAdminCapabilityMap(role: AppRole | null | undefined): AdminCapabilityMap {
  if (!role) return { ...ALL_FALSE_CAPABILITIES };
  return { ...DEFAULT_CAPABILITY_MATRIX[role] };
}

export function isAdminCapabilityLocked(role: AppRole, capability: AdminCapabilityKey) {
  return ADMIN_LOCKED_CAPABILITIES.some((lock) => lock.role === role && lock.capability === capability);
}
