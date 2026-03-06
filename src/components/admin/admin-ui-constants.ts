import type { AppRole } from '@/types/hrms';

export const ADMIN_ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-rose-50 text-rose-800 border-rose-200',
  hr: 'bg-violet-50 text-violet-800 border-violet-200',
  director: 'bg-amber-50 text-amber-800 border-amber-200',
  general_manager: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  manager: 'bg-blue-50 text-blue-800 border-blue-200',
  employee: 'bg-slate-100 text-slate-700 border-slate-300',
};

export type AdminTabKey = 'employees' | 'departments' | 'roles' | 'leave-policies';

export type LeavePolicySubTabKey =
  | 'leave-types'
  | 'operations'
  | 'balance-adjustments'
  | 'workflow-builders'
  | 'workflow-audit'
  | 'notification-queue'
  | 'analytics-simulation';

export function getDefaultAdminTabForRole(role: AppRole | null | undefined): AdminTabKey {
  return role === 'admin' ? 'roles' : 'employees';
}
