import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useMyAdminCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useLeaveDelegatedApprovalAccess } from '@/hooks/useLeaveDelegations';
import {
  canConductPerformanceReviews,
  canManageDocuments,
  canViewEmployeeDirectory,
  canViewManagerDashboardWidgets,
  canViewTeamLeaveRequests,
} from '@/lib/permissions';

import { buildCommandActions } from './command-registry';

export function useCommandPaletteActions() {
  const { role, user } = useAuth();
  const { capabilityMap } = useMyAdminCapabilities(role);
  const { data: delegatedApprovalAccess } = useLeaveDelegatedApprovalAccess();

  return useMemo(
    () =>
      buildCommandActions({
        role,
        canAccessAdminConsole: capabilityMap.access_admin_console,
        canViewEmployeeDirectory: canViewEmployeeDirectory(role),
        canManageDepartments: capabilityMap.manage_departments,
        canCreateEmployee: capabilityMap.create_employee,
        canCreateLeaveRequest: Boolean(user?.id),
        canViewTeamLeaveRequests: canViewTeamLeaveRequests(role),
        canAccessCalendar: canViewManagerDashboardWidgets(role),
        canManageDocuments: canManageDocuments(role),
        canConductPerformanceReviews: canConductPerformanceReviews(role),
        canViewAdminQuickActions: capabilityMap.view_admin_quick_actions,
        canManageLeavePolicies: capabilityMap.manage_leave_policies,
        canManageRoles: capabilityMap.manage_roles,
        hasDelegatedLeaveApproval: Boolean(delegatedApprovalAccess?.hasAny),
      }),
    [
      capabilityMap.access_admin_console,
      capabilityMap.create_employee,
      capabilityMap.manage_departments,
      capabilityMap.manage_leave_policies,
      capabilityMap.manage_roles,
      capabilityMap.view_admin_quick_actions,
      delegatedApprovalAccess?.hasAny,
      role,
      user?.id,
    ],
  );
}
