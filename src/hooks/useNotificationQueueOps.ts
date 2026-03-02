import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedRpc } from '@/integrations/supabase/untyped-client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationQueueStatusFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'failed'
  | 'sent'
  | 'discarded';

// Local type for notification_delivery_queue (not in generated types)
export interface NotificationDeliveryQueueRow {
  id: string;
  user_id: string;
  notification_id: string | null;
  channel: string;
  status: string;
  payload: unknown;
  error_message: string | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationQueueSummary = {
  pending_count: number;
  processing_count: number;
  failed_count: number;
  sent_count: number;
  discarded_count: number;
  ready_to_retry_failed_count: number;
  oldest_pending_at: string | null;
  generated_at: string;
};

type ProfileLite = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type NotificationQueueItemWithUser = NotificationDeliveryQueueRow & {
  user_profile: ProfileLite | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseQueueSummary(value: Json | null): NotificationQueueSummary {
  const fallback: NotificationQueueSummary = {
    pending_count: 0,
    processing_count: 0,
    failed_count: 0,
    sent_count: 0,
    discarded_count: 0,
    ready_to_retry_failed_count: 0,
    oldest_pending_at: null,
    generated_at: new Date().toISOString(),
  };

  if (!isObject(value)) return fallback;

  const toInt = (key: keyof NotificationQueueSummary) => {
    const raw = value[key as string];
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    pending_count: toInt('pending_count'),
    processing_count: toInt('processing_count'),
    failed_count: toInt('failed_count'),
    sent_count: toInt('sent_count'),
    discarded_count: toInt('discarded_count'),
    ready_to_retry_failed_count: toInt('ready_to_retry_failed_count'),
    oldest_pending_at:
      typeof value.oldest_pending_at === 'string' ? value.oldest_pending_at : null,
    generated_at:
      typeof value.generated_at === 'string' ? value.generated_at : fallback.generated_at,
  };
}

export function useNotificationQueueOps(status: NotificationQueueStatusFilter, limitCount = 25) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notification-queue-summary', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['notification-queue-list', user?.id] }),
    ]);
  };

  const summaryQuery = useQuery({
    queryKey: ['notification-queue-summary', user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await untypedRpc('notification_admin_email_queue_summary');
      if (error) throw error;
      return parseQueueSummary(data ?? null);
    },
  });

  const listQuery = useQuery({
    queryKey: ['notification-queue-list', user?.id, status, limitCount],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await untypedRpc('notification_admin_list_email_queue', {
        _status: status,
        _limit: limitCount,
        _offset: 0,
      });

      if (error) throw error;

      const rows = (data ?? []) as NotificationDeliveryQueueRow[];
      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

      let profileById = new Map<string, ProfileLite>();

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        profileById = new Map(((profiles ?? []) as ProfileLite[]).map((row) => [row.id, row]));
      }

      return rows.map((row) => ({
        ...row,
        user_profile: profileById.get(row.user_id) ?? null,
      })) as NotificationQueueItemWithUser[];
    },
  });

  const requeueMutation = useMutation({
    mutationFn: async ({ queueId, delaySeconds = 0 }: { queueId: string; delaySeconds?: number }) => {
      const { data, error } = await untypedRpc('notification_admin_requeue_email_queue_item', {
        _queue_id: queueId,
        _delay_seconds: delaySeconds,
      });
      if (error) throw error;
      return data as NotificationDeliveryQueueRow;
    },
    onSuccess: invalidate,
  });

  const discardMutation = useMutation({
    mutationFn: async ({ queueId, reason }: { queueId: string; reason?: string }) => {
      const { data, error } = await untypedRpc('notification_admin_discard_email_queue_item', {
        _queue_id: queueId,
        _reason: reason ?? null,
      });
      if (error) throw error;
      return data as NotificationDeliveryQueueRow;
    },
    onSuccess: invalidate,
  });

  return {
    summary: summaryQuery.data ?? null,
    queueItems: listQuery.data ?? [],
    isLoading: summaryQuery.isLoading || listQuery.isLoading,
    isFetching: summaryQuery.isFetching || listQuery.isFetching,
    summaryError: summaryQuery.error,
    listError: listQuery.error,
    isRequeueing: requeueMutation.isPending,
    isDiscarding: discardMutation.isPending,
    refetch: async () => {
      await Promise.all([summaryQuery.refetch(), listQuery.refetch()]);
    },
    requeueItem: async (queueId: string, delaySeconds = 0) =>
      requeueMutation.mutateAsync({ queueId, delaySeconds }),
    discardItem: async (queueId: string, reason?: string) =>
      discardMutation.mutateAsync({ queueId, reason }),
  };
}
