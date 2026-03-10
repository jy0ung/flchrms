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

const EXACT_PATH_LABELS: Record<string, string> = {
  '/admin': 'Governance',
  '/admin/dashboard': 'Governance Dashboard',
  '/admin/quick-actions': 'Governance Hub',
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
  more: 'More',
} as const;

export function getRouteLabel(segment: string): string {
  return ROUTE_LABELS[segment] || segment;
}

export function getTopBarTitle(pathname: string): string {
  const normalizedPath = pathname.split(/[?#]/, 1)[0] || '/';
  const exactLabel = EXACT_PATH_LABELS[normalizedPath];

  if (exactLabel) {
    return exactLabel;
  }

  const segments = normalizedPath.split('/').filter(Boolean);

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const label = ROUTE_LABELS[segments[index]];
    if (label) {
      return label;
    }
  }

  return 'HRMS';
}
