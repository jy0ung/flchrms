import type { AppRole } from '@/types/hrms';

export const ADMIN_ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  hr: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  director: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  general_manager: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  employee: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export type AdminTabKey = 'employees' | 'departments' | 'roles' | 'leave-policies';

export function getDefaultAdminTabForRole(role: AppRole | null | undefined): AdminTabKey {
  return role === 'admin' ? 'roles' : 'employees';
}
