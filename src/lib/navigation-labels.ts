import type { AppRole } from '@/types/hrms';

export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  leave: 'Leave',
  notifications: 'Notifications',
  attendance: 'Attendance',
  training: 'Training',
  announcements: 'Announcements',
  profile: 'Profile',
  performance: 'Performance',
  calendar: 'Calendar',
  documents: 'Documents',
  payroll: 'Payroll',
  employees: 'Employees',
  departments: 'Departments',
  admin: 'Governance',
  'quick-actions': 'Governance Hub',
  roles: 'Roles',
  'leave-policies': 'Leave Policies',
  'audit-log': 'Audit Log',
  settings: 'Settings',
};

export const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  admin: 'Admin',
  hr: 'HR',
  director: 'Director',
  general_manager: 'General Manager',
  manager: 'Manager',
  employee: 'Employee',
};

export const SHELL_LABELS = {
  governance: 'Governance',
  governanceHub: 'Governance Hub',
  dashboard: 'Dashboard',
  notifications: 'Notifications',
} as const;
