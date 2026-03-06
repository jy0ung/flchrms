import { useCallback, useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { canManageDocuments } from '@/lib/permissions';
import type { AdminCapabilities } from '@/lib/admin-permissions';
import type { Profile } from '@/types/hrms';

import type {
  EmployeeEditAccessMode,
  EmployeePageActionPermissions,
  EmployeeRowActionPermissions,
} from '../types';

interface UseEmployeeModuleCapabilitiesOptions {
  adminCapabilitiesOverride?: AdminCapabilities;
}

export function useEmployeeModuleCapabilities({
  adminCapabilitiesOverride,
}: UseEmployeeModuleCapabilitiesOptions = {}) {
  const { user, role } = useAuth();
  const adminCapabilityQuery = useAdminPageCapabilities(role);
  const capabilities = adminCapabilitiesOverride ?? adminCapabilityQuery.capabilities;

  const canOpenDocumentsTab = canManageDocuments(role);

  const isManagerDirectReport = useCallback(
    (employee: Pick<Profile, 'manager_id'>) => role === 'manager' && !!user && employee.manager_id === user.id,
    [role, user],
  );

  const getEditAccessMode = useCallback(
    (employee: Pick<Profile, 'manager_id'>): EmployeeEditAccessMode => {
      if (capabilities.canManageEmployeeProfiles) {
        return capabilities.isAdminLimitedProfileEditor ? 'alias_only' : 'full';
      }

      if (isManagerDirectReport(employee)) {
        return 'manager_limited';
      }

      return 'none';
    },
    [capabilities.canManageEmployeeProfiles, capabilities.isAdminLimitedProfileEditor, isManagerDirectReport],
  );

  const getRowPermissions = useCallback(
    (employee: Pick<Profile, 'manager_id'>): EmployeeRowActionPermissions => {
      const editAccessMode = getEditAccessMode(employee);
      const canFullManage = editAccessMode === 'full';

      return {
        editAccessMode,
        canResetPassword: canFullManage && capabilities.canResetEmployeePasswords,
        canManageRole: canFullManage && capabilities.canManageRoles,
        canArchiveRestore: canFullManage,
        canOpenDocumentsTab,
      };
    },
    [capabilities.canManageRoles, capabilities.canResetEmployeePasswords, canOpenDocumentsTab, getEditAccessMode],
  );

  const pageActions = useMemo<EmployeePageActionPermissions>(
    () => ({
      canCreateEmployee: capabilities.canCreateEmployee && !capabilities.isAdminLimitedProfileEditor,
      canImportEmployees: capabilities.canManageEmployeeProfiles && !capabilities.isAdminLimitedProfileEditor,
      canBulkActions: capabilities.canManageEmployeeProfiles && !capabilities.isAdminLimitedProfileEditor,
      canExportEmployees: capabilities.canManageEmployeeProfiles && !capabilities.isAdminLimitedProfileEditor,
      canViewSensitiveIdentifiers: capabilities.canViewSensitiveEmployeeIdentifiers,
      canOpenDocumentsTab,
    }),
    [
      capabilities.canCreateEmployee,
      capabilities.isAdminLimitedProfileEditor,
      capabilities.canManageEmployeeProfiles,
      capabilities.canViewSensitiveEmployeeIdentifiers,
      canOpenDocumentsTab,
    ],
  );

  return {
    capabilities,
    isLoading: !adminCapabilitiesOverride && adminCapabilityQuery.isLoading,
    isManagerDirectReport,
    getEditAccessMode,
    getRowPermissions,
    pageActions,
  };
}
