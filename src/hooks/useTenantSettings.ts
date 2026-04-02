import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { untypedFrom, untypedRpc } from '@/integrations/supabase/untyped-client';

export interface TenantSettings {
  id: string;
  timezone: string;
  dateFormat: string;
  emailNotificationsEnabled: boolean;
  sessionTimeoutMinutes: number;
  maintenanceMode: boolean;
}

export type TenantSettingsUpdate = Partial<
  Pick<
    TenantSettings,
    | 'timezone'
    | 'dateFormat'
    | 'emailNotificationsEnabled'
    | 'sessionTimeoutMinutes'
    | 'maintenanceMode'
  >
>;

interface TenantSettingsRow {
  id: string;
  timezone: string;
  date_format: string;
  email_notifications_enabled: boolean;
  session_timeout_minutes: number;
  maintenance_mode: boolean;
}

export const TENANT_SETTINGS_DEFAULTS: TenantSettings = {
  id: '',
  timezone: 'Asia/Kuala_Lumpur',
  dateFormat: 'DD/MM/YYYY',
  emailNotificationsEnabled: true,
  sessionTimeoutMinutes: 30,
  maintenanceMode: false,
};

const TENANT_SETTINGS_QUERY_KEY = ['tenant-settings'] as const;

function mapTenantSettingsRow(row: Partial<TenantSettingsRow> | null | undefined): TenantSettings {
  return {
    id: row?.id ?? TENANT_SETTINGS_DEFAULTS.id,
    timezone: row?.timezone ?? TENANT_SETTINGS_DEFAULTS.timezone,
    dateFormat: row?.date_format ?? TENANT_SETTINGS_DEFAULTS.dateFormat,
    emailNotificationsEnabled:
      row?.email_notifications_enabled ?? TENANT_SETTINGS_DEFAULTS.emailNotificationsEnabled,
    sessionTimeoutMinutes:
      row?.session_timeout_minutes ?? TENANT_SETTINGS_DEFAULTS.sessionTimeoutMinutes,
    maintenanceMode: row?.maintenance_mode ?? TENANT_SETTINGS_DEFAULTS.maintenanceMode,
  };
}

function mapTenantSettingsUpdate(updates: TenantSettingsUpdate) {
  return {
    ...(updates.timezone !== undefined ? { timezone: updates.timezone } : {}),
    ...(updates.dateFormat !== undefined ? { date_format: updates.dateFormat } : {}),
    ...(updates.emailNotificationsEnabled !== undefined
      ? { email_notifications_enabled: updates.emailNotificationsEnabled }
      : {}),
    ...(updates.sessionTimeoutMinutes !== undefined
      ? { session_timeout_minutes: updates.sessionTimeoutMinutes }
      : {}),
    ...(updates.maintenanceMode !== undefined
      ? { maintenance_mode: updates.maintenanceMode }
      : {}),
  };
}

export function useTenantSettings() {
  return useQuery({
    queryKey: TENANT_SETTINGS_QUERY_KEY,
    queryFn: async (): Promise<TenantSettings> => {
      const { data, error } = await untypedFrom('tenant_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Failed to fetch tenant settings, using defaults:', error.message);
        return TENANT_SETTINGS_DEFAULTS;
      }

      return mapTenantSettingsRow(data as TenantSettingsRow | null);
    },
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ updates, reason }: { updates: TenantSettingsUpdate; reason: string }) => {
      const { error } = await untypedRpc('admin_upsert_tenant_settings', {
        _updates: mapTenantSettingsUpdate(updates),
        _reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_SETTINGS_QUERY_KEY });
      toast.success('Tenant settings updated successfully');
    },
    onError: (error) => {
      console.error('Tenant settings update failed:', error);
      toast.error('Failed to update tenant settings');
    },
  });
}
