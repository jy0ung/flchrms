import type { AppRole } from '@/types/hrms';

export type MobilePrimaryRouteId =
  | 'dashboard'
  | 'leave'
  | 'employees'
  | 'payroll'
  | 'notifications'
  | 'governance';

export const MOBILE_ROLE_JOURNEYS: Record<AppRole, MobilePrimaryRouteId[]> = {
  employee: ['dashboard', 'leave', 'payroll', 'notifications'],
  manager: ['dashboard', 'leave', 'employees', 'notifications'],
  general_manager: ['dashboard', 'leave', 'employees', 'notifications'],
  hr: ['dashboard', 'leave', 'employees', 'notifications'],
  director: ['dashboard', 'leave', 'employees', 'notifications'],
  admin: ['dashboard', 'employees', 'governance', 'notifications'],
};

