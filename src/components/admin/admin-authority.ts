import type { AppRole } from '@/types/hrms';

export type AuthorityTier = {
  level: number;
  label: string;
  shortLabel: string;
};

const ROLE_TIER_LEVEL: Record<AppRole, number> = {
  employee: 1,
  manager: 2,
  general_manager: 3,
  hr: 4,
  admin: 5,
  director: 6,
};

const ROLE_TIER_LABEL: Record<AppRole, string> = {
  employee: 'Tier 1 · Employee',
  manager: 'Tier 2 · Manager',
  general_manager: 'Tier 3 · General Manager',
  hr: 'Tier 4 · HR',
  admin: 'Tier 5 · Admin',
  director: 'Tier 6 · Director',
};

const ROLE_TIER_SHORT: Record<AppRole, string> = {
  employee: 'T1',
  manager: 'T2',
  general_manager: 'T3',
  hr: 'T4',
  admin: 'T5',
  director: 'T6',
};

export function getRoleAuthorityTier(role: AppRole): AuthorityTier {
  return {
    level: ROLE_TIER_LEVEL[role],
    label: ROLE_TIER_LABEL[role],
    shortLabel: ROLE_TIER_SHORT[role],
  };
}

export function canManageTargetRole(
  actorRole: AppRole | null | undefined,
  targetRole: AppRole,
): boolean {
  if (!actorRole) return false;
  return ROLE_TIER_LEVEL[actorRole] > ROLE_TIER_LEVEL[targetRole];
}

