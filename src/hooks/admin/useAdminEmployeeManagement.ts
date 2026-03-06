import type { AppRole } from '@/types/hrms';
import { useEmployeeManagementController } from '@/modules/employees/hooks/useEmployeeManagementController';

interface UseAdminEmployeeManagementParams {
  getUserRole: (userId: string) => AppRole;
  isAdminLimitedProfileEditor: boolean;
}

export function useAdminEmployeeManagement({
  getUserRole,
  isAdminLimitedProfileEditor,
}: UseAdminEmployeeManagementParams) {
  const canManagePrivilegedActions = !isAdminLimitedProfileEditor;

  return useEmployeeManagementController({
    getUserRole,
    isAdminLimitedProfileEditor,
    resolveEditAccessMode: () => (isAdminLimitedProfileEditor ? 'alias_only' : 'full'),
    resolveRowPermissions: () => ({
      canResetPassword: canManagePrivilegedActions,
      canManageRole: canManagePrivilegedActions,
      canArchiveRestore: canManagePrivilegedActions,
    }),
  });
}
