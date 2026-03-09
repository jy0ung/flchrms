import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Plus,
  Shield,
  User,
  Users,
  Wallet,
  Workflow,
  Building2,
} from 'lucide-react';

import type { AppRole } from '@/types/hrms';

export type CommandGroupId = 'workspaces' | 'actions' | 'admin';

export interface CommandContext {
  role: AppRole | null | undefined;
  canAccessAdminConsole: boolean;
  canViewEmployeeDirectory: boolean;
  canManageDepartments: boolean;
  canCreateEmployee: boolean;
  canCreateLeaveRequest: boolean;
  canViewTeamLeaveRequests: boolean;
  canAccessCalendar: boolean;
  canManageDocuments: boolean;
  canConductPerformanceReviews: boolean;
  canViewAdminQuickActions: boolean;
  canManageLeavePolicies: boolean;
  canManageRoles: boolean;
  hasDelegatedLeaveApproval: boolean;
}

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  group: CommandGroupId;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
}

export const COMMAND_GROUP_ORDER: CommandGroupId[] = ['workspaces', 'actions', 'admin'];

export const COMMAND_GROUP_LABELS: Record<CommandGroupId, string> = {
  workspaces: 'Work',
  actions: 'Actions',
  admin: 'Governance',
};

function addCommand(
  commands: CommandAction[],
  condition: boolean,
  command: CommandAction,
) {
  if (condition) {
    commands.push(command);
  }
}

export function buildCommandActions(context: CommandContext): CommandAction[] {
  const commands: CommandAction[] = [];

  addCommand(commands, true, {
    id: 'open-dashboard',
    label: 'Open Dashboard',
    description: 'Navigate to the operational overview dashboard.',
    group: 'workspaces',
    href: '/dashboard',
    icon: LayoutDashboard,
    keywords: ['home', 'overview', 'dashboard'],
  });
  addCommand(commands, true, {
    id: 'open-leave',
    label: 'Open Leave Workspace',
    description: 'Navigate to leave requests and approvals.',
    group: 'workspaces',
    href: '/leave',
    icon: Calendar,
    keywords: ['leave', 'requests', 'approvals'],
  });
  addCommand(commands, true, {
    id: 'open-attendance',
    label: 'Open Attendance',
    description: 'Navigate to attendance tracking.',
    group: 'workspaces',
    href: '/attendance',
    icon: Clock,
    keywords: ['attendance', 'time'],
  });
  addCommand(commands, true, {
    id: 'open-payroll',
    label: 'Open Payroll',
    description: 'Navigate to payroll and compensation records.',
    group: 'workspaces',
    href: '/payroll',
    icon: Wallet,
    keywords: ['payroll', 'salary', 'compensation'],
  });
  addCommand(commands, true, {
    id: 'open-notifications',
    label: 'Open Notifications',
    description: 'Review alerts and workflow updates.',
    group: 'workspaces',
    href: '/notifications',
    icon: Bell,
    keywords: ['alerts', 'notifications', 'inbox'],
  });
  addCommand(commands, true, {
    id: 'open-announcements',
    label: 'Open Announcements',
    description: 'Review company-wide updates.',
    group: 'workspaces',
    href: '/announcements',
    icon: Megaphone,
    keywords: ['announcements', 'news', 'updates'],
  });
  addCommand(commands, true, {
    id: 'open-training',
    label: 'Open Training',
    description: 'Navigate to learning and training modules.',
    group: 'workspaces',
    href: '/training',
    icon: GraduationCap,
    keywords: ['training', 'learning', 'courses'],
  });
  addCommand(commands, true, {
    id: 'open-profile',
    label: 'Open Profile',
    description: 'Navigate to your profile settings.',
    group: 'workspaces',
    href: '/profile',
    icon: User,
    keywords: ['profile', 'account'],
  });
  addCommand(commands, context.canViewEmployeeDirectory, {
    id: 'open-employees',
    label: 'Open Employees',
    description: 'Navigate to the employee directory workspace.',
    group: 'workspaces',
    href: '/employees',
    icon: Users,
    keywords: ['employees', 'directory', 'people', 'staff'],
  });
  addCommand(commands, context.canManageDepartments, {
    id: 'open-departments',
    label: 'Open Departments',
    description: 'Navigate to department ownership and structure.',
    group: 'workspaces',
    href: '/departments',
    icon: Building2,
    keywords: ['departments', 'organization', 'teams', 'people structure'],
  });
  addCommand(commands, context.canAccessCalendar, {
    id: 'open-calendar',
    label: 'Open Team Calendar',
    description: 'Navigate to team availability and leave calendar.',
    group: 'workspaces',
    href: '/calendar',
    icon: CalendarDays,
    keywords: ['calendar', 'availability', 'schedule'],
  });
  addCommand(commands, context.canManageDocuments, {
    id: 'open-documents',
    label: 'Open Documents',
    description: 'Navigate to managed employee documents.',
    group: 'workspaces',
    href: '/documents',
    icon: FileText,
    keywords: ['documents', 'files'],
  });
  addCommand(commands, context.canConductPerformanceReviews, {
    id: 'open-performance',
    label: 'Open Performance',
    description: 'Navigate to performance review workflows.',
    group: 'workspaces',
    href: '/performance',
    icon: BarChart3,
    keywords: ['performance', 'reviews'],
  });
  addCommand(commands, context.canAccessAdminConsole, {
    id: 'open-admin',
    label: 'Open Governance Console',
    description: 'Navigate to governance, policy, and system controls.',
    group: 'workspaces',
    href: '/admin',
    icon: Shield,
    keywords: ['admin', 'governance', 'system', 'console'],
  });

  addCommand(commands, context.canCreateLeaveRequest, {
    id: 'request-leave',
    label: 'Request Leave',
    description: 'Open the leave request wizard in the leave workspace.',
    group: 'actions',
    href: '/leave?command=request',
    icon: Plus,
    keywords: ['request leave', 'apply leave', 'new leave'],
  });
  addCommand(commands, context.canViewTeamLeaveRequests || context.hasDelegatedLeaveApproval, {
    id: 'review-leave-approvals',
    label: 'Review Leave Approvals',
    description: 'Jump directly to the team leave approval inbox.',
    group: 'actions',
    href: '/leave?workspaceView=TEAM_CURRENT',
    icon: Workflow,
    keywords: ['approve leave', 'leave approval', 'team inbox'],
  });
  addCommand(commands, context.canCreateEmployee, {
    id: 'create-employee',
    label: 'Create Employee',
    description: 'Open the create employee dialog in the employee workspace.',
    group: 'actions',
    href: '/employees?command=create',
    icon: Plus,
    keywords: ['create employee', 'new employee', 'add employee'],
  });
  addCommand(commands, context.canManageDepartments, {
    id: 'create-department',
    label: 'Create Department',
    description: 'Open the create department dialog in the departments workspace.',
    group: 'actions',
    href: '/departments?command=create',
    icon: Plus,
    keywords: ['create department', 'new department'],
  });

  addCommand(commands, context.canViewAdminQuickActions, {
    id: 'open-admin-quick-actions',
    label: 'Open Governance Hub',
    description: 'Open the admin routing hub for governance tasks.',
    group: 'admin',
    href: '/admin/quick-actions',
    icon: Shield,
    keywords: ['admin quick actions', 'admin routing', 'governance hub'],
  });
  addCommand(commands, context.canManageRoles, {
    id: 'open-role-management',
    label: 'Open Role Management',
    description: 'Navigate to admin role and capability management.',
    group: 'admin',
    href: '/admin/roles',
    icon: Shield,
    keywords: ['roles', 'permissions', 'capabilities'],
  });
  addCommand(commands, context.canManageLeavePolicies, {
    id: 'open-leave-policies',
    label: 'Open Leave Policies',
    description: 'Navigate to leave policy and workflow settings.',
    group: 'admin',
    href: '/admin/leave-policies',
    icon: CalendarDays,
    keywords: ['leave policies', 'workflow settings'],
  });

  return commands;
}
