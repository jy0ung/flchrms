import { Bell, Calendar, Clock, LayoutDashboard, Shield, Users, Wallet } from 'lucide-react';

import { ROUTE_LABELS, SHELL_LABELS } from '@/lib/navigation-labels';
import { canAccessAdminConsole, canViewEmployeeDirectory } from '@/lib/permissions';
import type { AppRole } from '@/types/hrms';
import { MOBILE_ROLE_JOURNEYS, type MobilePrimaryRouteId } from './mobile-role-journeys';

export interface BottomNavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const MOBILE_PRIMARY_ROUTE_CONFIG: Record<MobilePrimaryRouteId, BottomNavItem> = {
  dashboard: { name: SHELL_LABELS.dashboard, href: '/dashboard', icon: LayoutDashboard },
  attendance: { name: ROUTE_LABELS.attendance, href: '/attendance', icon: Clock },
  leave: { name: ROUTE_LABELS.leave, href: '/leave', icon: Calendar },
  employees: { name: ROUTE_LABELS.employees, href: '/employees', icon: Users },
  payroll: { name: ROUTE_LABELS.payroll, href: '/payroll', icon: Wallet },
  notifications: { name: SHELL_LABELS.notifications, href: '/notifications', icon: Bell },
  governance: { name: SHELL_LABELS.governance, href: '/admin', icon: Shield },
};

/**
 * Build mobile bottom navigation items for the current role.
 * Applies the same permission checks as AppSidebar to ensure consistency
 * between desktop and mobile navigation.
 *
 * Permission checks follow the sidebar pattern:
 * - canAccessAdminConsole: Controls visibility of /admin (governance) navigation
 * - canViewEmployeeDirectory: Controls visibility of /employees (directory access)
 */
export function buildBottomNavItems(role: AppRole | null | undefined): BottomNavItem[] {
  const journey = MOBILE_ROLE_JOURNEYS[role ?? 'employee'] ?? MOBILE_ROLE_JOURNEYS.employee;
  
  // Filter routes based on permission checks, matching sidebar logic
  return journey
    .filter((routeId) => {
      // Admin console: require canAccessAdminConsole permission
      if (routeId === 'governance') {
        return canAccessAdminConsole(role ?? 'employee');
      }
      
      // Employees/Directory: require canViewEmployeeDirectory permission
      if (routeId === 'employees') {
        return canViewEmployeeDirectory(role ?? 'employee');
      }
      
      // All other routes (dashboard, leave, attendance, payroll, notifications) always visible
      return true;
    })
    .map((routeId) => MOBILE_PRIMARY_ROUTE_CONFIG[routeId]);
}
