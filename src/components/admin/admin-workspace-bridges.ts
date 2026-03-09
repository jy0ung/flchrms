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
    title: 'Employee management now lives in the employee workspace',
    description:
      'This admin path is still available for compatibility, but the canonical surface for directory work, bulk actions, and profile updates is the employee module.',
    supportingText:
      'Use this route only when you need a legacy admin bookmark or wrapper-specific access path.',
    quickActionTitle: 'Open Employee Workspace',
    quickActionDescription:
      'Open the canonical employee management workspace for records, bulk actions, and profile updates.',
    quickActionColor: 'text-blue-600',
    quickActionBg: 'bg-blue-50 dark:bg-blue-950/50',
    icon: Users,
  },
  departments: {
    id: 'departments',
    capability: 'manage_departments',
    destination: '/departments',
    actionLabel: 'Open Department Workspace',
    title: 'Department management now lives in the department workspace',
    description:
      'This admin path remains available for compatibility, but the canonical surface for staffing and structure changes is the department module.',
    supportingText:
      'Use this route only when you need a legacy admin bookmark or wrapper-specific access path.',
    quickActionTitle: 'Open Department Workspace',
    quickActionDescription:
      'Open the canonical department management workspace for structure and staffing changes.',
    quickActionColor: 'text-violet-600',
    quickActionBg: 'bg-violet-50 dark:bg-violet-950/50',
    icon: Building2,
  },
};

export const ADMIN_WORKSPACE_BRIDGE_LIST = Object.values(ADMIN_WORKSPACE_BRIDGES);
