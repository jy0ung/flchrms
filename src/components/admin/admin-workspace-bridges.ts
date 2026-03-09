import type { ComponentType } from 'react';
import { Building2, Users } from 'lucide-react';

import type { AdminCapabilityKey } from '@/lib/admin-capabilities';

export type AdminWorkspaceBridgeId = 'employees' | 'departments';

export interface AdminWorkspaceBridgeDefinition {
  id: AdminWorkspaceBridgeId;
  capability: AdminCapabilityKey;
  destination: string;
  actionLabel: string;
  title: string;
  description: string;
  supportingText: string;
  quickActionTitle: string;
  quickActionDescription: string;
  quickActionColor: string;
  quickActionBg: string;
  icon: ComponentType<{ className?: string }>;
}

export const ADMIN_WORKSPACE_BRIDGES: Record<AdminWorkspaceBridgeId, AdminWorkspaceBridgeDefinition> = {
  employees: {
    id: 'employees',
    capability: 'manage_employee_directory',
    destination: '/employees',
    actionLabel: 'Open Employee Workspace',
    title: 'Use the employee workspace for people operations',
    description:
      'This admin route remains available for bookmarks and legacy entry points. Day-to-day directory work, bulk actions, and profile updates happen in the employee workspace.',
    supportingText:
      'Stay here only if you intentionally need the admin wrapper.',
    quickActionTitle: 'Open Employee Workspace',
    quickActionDescription:
      'Open the employee workspace for directory work, bulk actions, and profile updates.',
    quickActionColor: 'text-blue-600',
    quickActionBg: 'bg-blue-50 dark:bg-blue-950/50',
    icon: Users,
  },
  departments: {
    id: 'departments',
    capability: 'manage_departments',
    destination: '/departments',
    actionLabel: 'Open Department Workspace',
    title: 'Use the department workspace for organization changes',
    description:
      'This admin route remains available for bookmarks and legacy entry points. Staffing and structure changes happen in the department workspace.',
    supportingText:
      'Stay here only if you intentionally need the admin wrapper.',
    quickActionTitle: 'Open Department Workspace',
    quickActionDescription:
      'Open the department workspace for structure and staffing changes.',
    quickActionColor: 'text-violet-600',
    quickActionBg: 'bg-violet-50 dark:bg-violet-950/50',
    icon: Building2,
  },
};

export const ADMIN_WORKSPACE_BRIDGE_LIST = Object.values(ADMIN_WORKSPACE_BRIDGES);
