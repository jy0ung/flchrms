import type { AppRole } from '@/types/hrms';

export type MobilePrimaryRouteId =
  | 'dashboard'
  | 'attendance'
  | 'leave'
  | 'employees'
  | 'payroll'
  | 'notifications'
  | 'governance';

/**
 * Base mobile role journeys - maps each role to their primary routes.
 * This is a static config per role. Permission helpers are applied in buildBottomNavItems
 * to ensure mobile nav respects the same permission checks as the sidebar.
 */
const BASE_MOBILE_ROLE_JOURNEYS: Record<AppRole, MobilePrimaryRouteId[]> = {
  employee: ['dashboard', 'attendance', 'leave', 'notifications'],
  manager: ['dashboard', 'leave', 'employees', 'notifications'],
  general_manager: ['dashboard', 'leave', 'employees', 'notifications'],
  hr: ['dashboard', 'leave', 'employees', 'notifications'],
  director: ['dashboard', 'leave', 'employees', 'notifications'],
  admin: ['dashboard', 'governance', 'employees', 'notifications'],
};

export const MOBILE_ROLE_JOURNEYS: Record<AppRole, MobilePrimaryRouteId[]> = BASE_MOBILE_ROLE_JOURNEYS;
