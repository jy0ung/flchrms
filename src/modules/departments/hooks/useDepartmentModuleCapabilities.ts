import { useCallback, useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import type { AdminCapabilities } from '@/lib/admin-permissions';

import type {
  DepartmentPageActionPermissions,
  DepartmentRowActionPermissions,
} from '../types';

interface UseDepartmentModuleCapabilitiesOptions {
  adminCapabilitiesOverride?: AdminCapabilities;
}

export function useDepartmentModuleCapabilities({
  adminCapabilitiesOverride,
}: UseDepartmentModuleCapabilitiesOptions = {}) {
  const { role } = useAuth();
  const adminCapabilityQuery = useAdminPageCapabilities(role);
  const capabilities = adminCapabilitiesOverride ?? adminCapabilityQuery.capabilities;

  const getRowPermissions = useCallback(
    ({ memberCount }: { memberCount: number }): DepartmentRowActionPermissions => ({
      canOpenDrawer: capabilities.canManageDepartments,
      canEditDepartment: capabilities.canManageDepartments,
      canDeleteDepartment: capabilities.canManageDepartments && memberCount === 0,
    }),
    [capabilities.canManageDepartments],
  );

  const pageActions = useMemo<DepartmentPageActionPermissions>(
    () => ({
      canManageDepartments: capabilities.canManageDepartments,
      canCreateDepartment: capabilities.canManageDepartments,
      canViewSensitiveIdentifiers: capabilities.canViewSensitiveEmployeeIdentifiers,
    }),
    [capabilities.canManageDepartments, capabilities.canViewSensitiveEmployeeIdentifiers],
  );

  return {
    capabilities,
    isLoading: !adminCapabilitiesOverride && adminCapabilityQuery.isLoading,
    pageActions,
    getRowPermissions,
  };
}
