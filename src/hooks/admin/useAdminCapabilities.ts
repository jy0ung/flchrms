import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AppRole } from '@/types/hrms';
import { getAdminCapabilities, type AdminCapabilities } from '@/lib/admin-permissions';
import {
  APP_ROLE_ORDER,
  ADMIN_CAPABILITY_KEYS,
  getDefaultAdminCapabilityMap,
  type AdminCapabilityKey,
  type AdminCapabilityMap,
} from '@/lib/admin-capabilities';
import { untypedRpc } from '@/integrations/supabase/untyped-client';
import { sanitizeErrorMessage } from '@/lib/error-utils';

export const ADMIN_CAPABILITY_QUERY_KEY = ['admin-capabilities'] as const;
export const ADMIN_CAPABILITY_MATRIX_QUERY_KEY = ['admin-capability-matrix'] as const;

export interface AdminCapabilityMatrixRow {
  role: AppRole;
  capability: AdminCapabilityKey;
  enabled: boolean;
  default_enabled: boolean;
  overridden: boolean;
  updated_at: string | null;
  updated_by: string | null;
  reason: string | null;
}

interface RawAdminCapabilityMatrixRow {
  role: string;
  capability: string;
  enabled: unknown;
  default_enabled: unknown;
  overridden: unknown;
  updated_at: string | null;
  updated_by: string | null;
  reason: string | null;
}

const ROLE_SET = new Set<AppRole>(APP_ROLE_ORDER);
const CAPABILITY_SET = new Set<AdminCapabilityKey>(ADMIN_CAPABILITY_KEYS);

function isAppRole(value: string): value is AppRole {
  return ROLE_SET.has(value as AppRole);
}

function isAdminCapabilityKey(value: string): value is AdminCapabilityKey {
  return CAPABILITY_SET.has(value as AdminCapabilityKey);
}

function parseCapabilityMap(
  role: AppRole | null | undefined,
  rawValue: unknown,
): AdminCapabilityMap {
  const fallback = getDefaultAdminCapabilityMap(role);

  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return fallback;
  }

  const parsed: AdminCapabilityMap = { ...fallback };
  for (const capability of ADMIN_CAPABILITY_KEYS) {
    const value = (rawValue as Record<string, unknown>)[capability];
    if (typeof value === 'boolean') {
      parsed[capability] = value;
    }
  }

  return parsed;
}

function parseMatrixRows(rawRows: unknown): AdminCapabilityMatrixRow[] {
  if (!Array.isArray(rawRows)) return [];

  return rawRows
    .map((row) => row as RawAdminCapabilityMatrixRow)
    .filter(
      (row) =>
        row &&
        typeof row.role === 'string' &&
        isAppRole(row.role) &&
        typeof row.capability === 'string' &&
        isAdminCapabilityKey(row.capability),
    )
    .map((row) => ({
      role: row.role as AppRole,
      capability: row.capability as AdminCapabilityKey,
      enabled: Boolean(row.enabled),
      default_enabled: Boolean(row.default_enabled),
      overridden: Boolean(row.overridden),
      updated_at: row.updated_at ?? null,
      updated_by: row.updated_by ?? null,
      reason: row.reason ?? null,
    }));
}

export function buildDefaultCapabilityMatrixRows(): AdminCapabilityMatrixRow[] {
  return APP_ROLE_ORDER.flatMap((role) => {
    const defaults = getDefaultAdminCapabilityMap(role);
    return ADMIN_CAPABILITY_KEYS.map((capability) => ({
      role,
      capability,
      enabled: defaults[capability],
      default_enabled: defaults[capability],
      overridden: false,
      updated_at: null,
      updated_by: null,
      reason: null,
    }));
  });
}

export function useMyAdminCapabilities(role: AppRole | null | undefined) {
  const fallbackCapabilities = useMemo(() => getDefaultAdminCapabilityMap(role), [role]);

  const query = useQuery({
    queryKey: [...ADMIN_CAPABILITY_QUERY_KEY, role],
    enabled: !!role,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await untypedRpc('admin_get_my_capabilities');
      if (error) throw error;
      return parseCapabilityMap(role, data);
    },
  });

  const capabilityMap = query.data ?? fallbackCapabilities;

  return {
    ...query,
    capabilityMap,
    isFallback: !query.data,
  };
}

export function useAdminPageCapabilities(role: AppRole | null | undefined): {
  capabilities: AdminCapabilities;
  capabilityMap: AdminCapabilityMap;
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;
  error: unknown;
} {
  const { capabilityMap, isLoading, isError, isFallback, error } = useMyAdminCapabilities(role);
  const capabilities = useMemo(
    () => getAdminCapabilities(role, capabilityMap),
    [capabilityMap, role],
  );

  return {
    capabilities,
    capabilityMap,
    isLoading,
    isError,
    isFallback,
    error,
  };
}

export function useAdminCapabilityMatrix(role: AppRole | null | undefined) {
  return useQuery({
    queryKey: [...ADMIN_CAPABILITY_MATRIX_QUERY_KEY, role],
    enabled: role === 'admin',
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await untypedRpc('admin_get_capability_matrix');
      if (error) throw error;
      return parseMatrixRows(data);
    },
  });
}

export interface SetAdminRoleCapabilityInput {
  role: AppRole;
  capability: AdminCapabilityKey;
  enabled: boolean;
  reason?: string | null;
}

export function useSetAdminRoleCapability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SetAdminRoleCapabilityInput) => {
      const { error } = await untypedRpc('admin_set_role_capability', {
        _role: input.role,
        _capability: input.capability,
        _enabled: input.enabled,
        _reason: input.reason ?? null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CAPABILITY_MATRIX_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_CAPABILITY_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error('Failed to update capability override', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}
