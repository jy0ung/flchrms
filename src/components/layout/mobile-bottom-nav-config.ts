import { Bell, Calendar, LayoutDashboard, Users, Wallet } from 'lucide-react';

import { ROUTE_LABELS, SHELL_LABELS } from '@/lib/navigation-labels';
import { canManagePayroll, canViewEmployeeDirectory } from '@/lib/permissions';
import type { AppRole } from '@/types/hrms';

export interface BottomNavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

export function buildBottomNavItems(role: AppRole | null | undefined): BottomNavItem[] {
  const workAnchor = canManagePayroll(role)
    ? { name: ROUTE_LABELS.payroll, href: '/payroll', icon: Wallet }
    : canViewEmployeeDirectory(role)
      ? { name: ROUTE_LABELS.employees, href: '/employees', icon: Users }
      : { name: ROUTE_LABELS.payroll, href: '/payroll', icon: Wallet };

  return [
    { name: SHELL_LABELS.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { name: ROUTE_LABELS.leave, href: '/leave', icon: Calendar },
    workAnchor,
    { name: SHELL_LABELS.notifications, href: '/notifications', icon: Bell },
  ];
}
