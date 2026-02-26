import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationQueueStatusFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'failed'
  | 'sent'
  | 'discarded';
export type NotificationWorkerRunStatusFilter = 'all' | 'running' | 'completed' | 'failed';

export type NotificationDeliveryQueueRow =
  Database['public']['Tables']['notification_delivery_queue']['Row'];
export type NotificationEmailWorkerRunRow =
  Database['public']['Tables']['notification_email_worker_runs']['Row'];

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

export type NotificationWorkerRunSummary = {
  running_count: number;
  completed_24h_count: number;
  failed_24h_count: number;
  claimed_24h_count: number;
  processed_24h_count: number;
  sent_24h_count: number;
  failed_items_24h_count: number;
  discarded_24h_count: number;
  avg_duration_ms_24h: number | null;
  latest_started_at: string | null;
  latest_completed_at: string | null;
  latest_failed_at: string | null;
  generated_at: string;
};

export type NotificationDeadLetterProviderRollup = {
  provider: string;
  count: number;
  failed_count: number;
  discarded_count: number;
  retry_ready_failed_count: number;
};

export type NotificationDeadLetterEventTypeRollup = {
  event_type: string;
  count: number;
  failed_count: number;
  discarded_count: number;
};

export type NotificationDeadLetterProviderEventTypeRollup = {
  provider: string;
  event_type: string;
  count: number;
  failed_count: number;
  discarded_count: number;
  retry_ready_failed_count: number;
};

export type NotificationDeadLetterTopError = {
  provider: string;
  event_type: string;
  error_fingerprint: string;
  count: number;
  max_attempts: number;
  latest_seen_at: string | null;
  retry_ready_failed_count: number;
};

export type NotificationDeadLetterAnalytics = {
  window_hours: number;
  generated_at: string;
  window_start: string | null;
  dead_letter_count: number;
  failed_count: number;
  discarded_count: number;
  retry_ready_failed_count: number;
  providers: NotificationDeadLetterProviderRollup[];
  event_types: NotificationDeadLetterEventTypeRollup[];
  provider_event_types: NotificationDeadLetterProviderEventTypeRollup[];
  top_errors: NotificationDeadLetterTopError[];
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

function parseWorkerRunSummary(value: Json | null): NotificationWorkerRunSummary {
  const fallback: NotificationWorkerRunSummary = {
    running_count: 0,
    completed_24h_count: 0,
    failed_24h_count: 0,
    claimed_24h_count: 0,
    processed_24h_count: 0,
    sent_24h_count: 0,
    failed_items_24h_count: 0,
    discarded_24h_count: 0,
    avg_duration_ms_24h: null,
    latest_started_at: null,
    latest_completed_at: null,
    latest_failed_at: null,
    generated_at: new Date().toISOString(),
  };

  if (!isObject(value)) return fallback;

  const toInt = (key: keyof NotificationWorkerRunSummary) => {
    const raw = value[key as string];
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toNullableString = (key: keyof NotificationWorkerRunSummary) => {
    const raw = value[key as string];
    return typeof raw === 'string' ? raw : null;
  };

  const rawAvg = value.avg_duration_ms_24h;
  const avgParsed = typeof rawAvg === 'number' ? rawAvg : rawAvg == null ? null : Number(rawAvg);

  return {
    running_count: toInt('running_count'),
    completed_24h_count: toInt('completed_24h_count'),
    failed_24h_count: toInt('failed_24h_count'),
    claimed_24h_count: toInt('claimed_24h_count'),
    processed_24h_count: toInt('processed_24h_count'),
    sent_24h_count: toInt('sent_24h_count'),
    failed_items_24h_count: toInt('failed_items_24h_count'),
    discarded_24h_count: toInt('discarded_24h_count'),
    avg_duration_ms_24h: avgParsed == null || !Number.isFinite(avgParsed) ? null : avgParsed,
    latest_started_at: toNullableString('latest_started_at'),
    latest_completed_at: toNullableString('latest_completed_at'),
    latest_failed_at: toNullableString('latest_failed_at'),
    generated_at:
      typeof value.generated_at === 'string' ? value.generated_at : fallback.generated_at,
  };
}

function parseString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseIntValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function parseDeadLetterAnalytics(value: Json | null): NotificationDeadLetterAnalytics {
  const fallback: NotificationDeadLetterAnalytics = {
    window_hours: 24,
    generated_at: new Date().toISOString(),
    window_start: null,
    dead_letter_count: 0,
    failed_count: 0,
    discarded_count: 0,
    retry_ready_failed_count: 0,
    providers: [],
    event_types: [],
    provider_event_types: [],
    top_errors: [],
  };

  if (!isObject(value)) return fallback;

  return {
    window_hours: parseIntValue(value.window_hours, 24),
    generated_at: parseString(value.generated_at, fallback.generated_at),
    window_start: parseNullableString(value.window_start),
    dead_letter_count: parseIntValue(value.dead_letter_count),
    failed_count: parseIntValue(value.failed_count),
    discarded_count: parseIntValue(value.discarded_count),
    retry_ready_failed_count: parseIntValue(value.retry_ready_failed_count),
    providers: parseObjectArray(value.providers).map((row) => ({
      provider: parseString(row.provider, 'unknown'),
      count: parseIntValue(row.count),
      failed_count: parseIntValue(row.failed_count),
      discarded_count: parseIntValue(row.discarded_count),
      retry_ready_failed_count: parseIntValue(row.retry_ready_failed_count),
    })),
    event_types: parseObjectArray(value.event_types).map((row) => ({
      event_type: parseString(row.event_type, 'unknown'),
      count: parseIntValue(row.count),
      failed_count: parseIntValue(row.failed_count),
      discarded_count: parseIntValue(row.discarded_count),
    })),
    provider_event_types: parseObjectArray(value.provider_event_types).map((row) => ({
      provider: parseString(row.provider, 'unknown'),
      event_type: parseString(row.event_type, 'unknown'),
      count: parseIntValue(row.count),
      failed_count: parseIntValue(row.failed_count),
      discarded_count: parseIntValue(row.discarded_count),
      retry_ready_failed_count: parseIntValue(row.retry_ready_failed_count),
    })),
    top_errors: parseObjectArray(value.top_errors).map((row) => ({
      provider: parseString(row.provider, 'unknown'),
      event_type: parseString(row.event_type, 'unknown'),
      error_fingerprint: parseString(row.error_fingerprint, '(no error captured)'),
      count: parseIntValue(row.count),
      max_attempts: parseIntValue(row.max_attempts),
      latest_seen_at: parseNullableString(row.latest_seen_at),
      retry_ready_failed_count: parseIntValue(row.retry_ready_failed_count),
    })),
  };
}

export function useNotificationQueueOps(status: NotificationQueueStatusFilter, limitCount = 25) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notification-queue-summary', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['notification-queue-list', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['notification-worker-run-summary', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['notification-worker-run-list', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['notification-dead-letter-analytics', user?.id] }),
    ]);
  };

  const summaryQuery = useQuery({
    queryKey: ['notification-queue-summary', user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('notification_admin_email_queue_summary');
      if (error) throw error;
      return parseQueueSummary(data ?? null);
    },
  });

  const listQuery = useQuery({
    queryKey: ['notification-queue-list', user?.id, status, limitCount],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('notification_admin_list_email_queue', {
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

  const workerRunSummaryQuery = useQuery({
    queryKey: ['notification-worker-run-summary', user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('notification_admin_email_worker_run_summary');
      if (error) throw error;
      return parseWorkerRunSummary(data ?? null);
    },
  });

  const workerRunListQuery = useQuery({
    queryKey: ['notification-worker-run-list', user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('notification_admin_list_email_worker_runs', {
        _status: 'all',
        _limit: 8,
        _offset: 0,
      });

      if (error) throw error;
      return (data ?? []) as NotificationEmailWorkerRunRow[];
    },
  });

  const deadLetterAnalyticsQuery = useQuery({
    queryKey: ['notification-dead-letter-analytics', user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('notification_admin_email_dead_letter_analytics', {
        _window_hours: 24,
        _limit: 8,
      });
      if (error) throw error;
      return parseDeadLetterAnalytics(data ?? null);
    },
  });

  const requeueMutation = useMutation({
    mutationFn: async ({ queueId, delaySeconds = 0 }: { queueId: string; delaySeconds?: number }) => {
      const { data, error } = await supabase.rpc('notification_admin_requeue_email_queue_item', {
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
      const { data, error } = await supabase.rpc('notification_admin_discard_email_queue_item', {
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
    workerRunSummary: workerRunSummaryQuery.data ?? null,
    workerRuns: workerRunListQuery.data ?? [],
    deadLetterAnalytics: deadLetterAnalyticsQuery.data ?? null,
    isLoading:
      summaryQuery.isLoading ||
      listQuery.isLoading ||
      workerRunSummaryQuery.isLoading ||
      workerRunListQuery.isLoading ||
      deadLetterAnalyticsQuery.isLoading,
    isFetching:
      summaryQuery.isFetching ||
      listQuery.isFetching ||
      workerRunSummaryQuery.isFetching ||
      workerRunListQuery.isFetching ||
      deadLetterAnalyticsQuery.isFetching,
    summaryError: summaryQuery.error,
    listError: listQuery.error,
    workerRunSummaryError: workerRunSummaryQuery.error,
    workerRunListError: workerRunListQuery.error,
    deadLetterAnalyticsError: deadLetterAnalyticsQuery.error,
    isRequeueing: requeueMutation.isPending,
    isDiscarding: discardMutation.isPending,
    refetch: async () => {
      await Promise.all([
        summaryQuery.refetch(),
        listQuery.refetch(),
        workerRunSummaryQuery.refetch(),
        workerRunListQuery.refetch(),
        deadLetterAnalyticsQuery.refetch(),
      ]);
    },
    requeueItem: async (queueId: string, delaySeconds = 0) =>
      requeueMutation.mutateAsync({ queueId, delaySeconds }),
    discardItem: async (queueId: string, reason?: string) =>
      discardMutation.mutateAsync({ queueId, reason }),
  };
}
