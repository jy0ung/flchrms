import type { AppRole } from '@/types/hrms';

export type MobilePrimaryRouteId =
  | 'dashboard'
  | 'attendance'
  | 'leave'
  | 'employees'
  | 'payroll'
  | 'notifications'
  | 'governance';

export const MOBILE_ROLE_JOURNEYS: Record<AppRole, MobilePrimaryRouteId[]> = {
  employee: ['dashboard', 'attendance', 'leave', 'notifications'],
  manager: ['dashboard', 'leave', 'employees', 'notifications'],
  general_manager: ['dashboard', 'leave', 'employees', 'notifications'],
  hr: ['dashboard', 'leave', 'employees', 'notifications'],
  director: ['dashboard', 'leave', 'employees', 'notifications'],
  admin: ['dashboard', 'governance', 'employees', 'notifications'],
};
