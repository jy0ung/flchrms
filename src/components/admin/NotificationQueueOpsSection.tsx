import { useEffect, useMemo, useState } from 'react';
import { differenceInMinutes, formatDistanceToNow } from 'date-fns';
import {
  BellRing,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useNotificationQueueOps,
  type NotificationQueueItemWithUser,
  type NotificationQueueStatusFilter,
  type NotificationEmailWorkerRunRow,
  type NotificationQueueSummary,
  type NotificationWorkerRunSummary,
} from '@/hooks/useNotificationQueueOps';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessAdminPage } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const FILTERS: { value: NotificationQueueStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'sent', label: 'Sent' },
  { value: 'discarded', label: 'Discarded' },
];

type QueueHealthSeverity = 'info' | 'warning' | 'critical';

type QueueHealthAlert = {
  id: string;
  severity: QueueHealthSeverity;
  title: string;
  description: string;
  recommendation?: string;
};

type QueueAlertThresholds = {
  failedBacklogCritical: number;
  retryReadyWarning: number;
  oldestPendingWarningMinutes: number;
  noCompletionCriticalMinutes: number;
  workerRunFailuresWarning24h: number;
  itemFailureRateWarning: number;
  avgDurationWarningMs: number;
};

const QUEUE_ALERT_THRESHOLDS_STORAGE_KEY = 'hrms.notification-queue-alert-thresholds.v1';

const DEFAULT_QUEUE_ALERT_THRESHOLDS: QueueAlertThresholds = {
  failedBacklogCritical: 20,
  retryReadyWarning: 10,
  oldestPendingWarningMinutes: 30,
  noCompletionCriticalMinutes: 60,
  workerRunFailuresWarning24h: 3,
  itemFailureRateWarning: 0.2,
  avgDurationWarningMs: 10000,
};

function sanitizeQueueAlertThresholds(
  value: Partial<Record<keyof QueueAlertThresholds, unknown>> | null | undefined,
): QueueAlertThresholds {
  const readInt = (key: keyof QueueAlertThresholds, fallback: number, min: number, max: number) => {
    const raw = value?.[key];
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  };

  const rawFailureRate = value?.itemFailureRateWarning;
  const parsedFailureRate =
    typeof rawFailureRate === 'number' ? rawFailureRate : Number(rawFailureRate);

  return {
    failedBacklogCritical: readInt('failedBacklogCritical', DEFAULT_QUEUE_ALERT_THRESHOLDS.failedBacklogCritical, 1, 10000),
    retryReadyWarning: readInt('retryReadyWarning', DEFAULT_QUEUE_ALERT_THRESHOLDS.retryReadyWarning, 1, 10000),
    oldestPendingWarningMinutes: readInt(
      'oldestPendingWarningMinutes',
      DEFAULT_QUEUE_ALERT_THRESHOLDS.oldestPendingWarningMinutes,
      1,
      24 * 60,
    ),
    noCompletionCriticalMinutes: readInt(
      'noCompletionCriticalMinutes',
      DEFAULT_QUEUE_ALERT_THRESHOLDS.noCompletionCriticalMinutes,
      1,
      24 * 60,
    ),
    workerRunFailuresWarning24h: readInt(
      'workerRunFailuresWarning24h',
      DEFAULT_QUEUE_ALERT_THRESHOLDS.workerRunFailuresWarning24h,
      1,
      1000,
    ),
    itemFailureRateWarning:
      Number.isFinite(parsedFailureRate)
        ? Math.min(1, Math.max(0.01, Number(parsedFailureRate)))
        : DEFAULT_QUEUE_ALERT_THRESHOLDS.itemFailureRateWarning,
    avgDurationWarningMs: readInt('avgDurationWarningMs', DEFAULT_QUEUE_ALERT_THRESHOLDS.avgDurationWarningMs, 100, 300000),
  };
}

function loadQueueAlertThresholds(): QueueAlertThresholds {
  if (typeof window === 'undefined') return DEFAULT_QUEUE_ALERT_THRESHOLDS;
  try {
    const raw = window.localStorage.getItem(QUEUE_ALERT_THRESHOLDS_STORAGE_KEY);
    if (!raw) return DEFAULT_QUEUE_ALERT_THRESHOLDS;
    return sanitizeQueueAlertThresholds(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return DEFAULT_QUEUE_ALERT_THRESHOLDS;
  }
}

function minutesSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, differenceInMinutes(new Date(), parsed));
}

function buildQueueHealthAlerts(
  summary: NotificationQueueSummary | null,
  workerRunSummary: NotificationWorkerRunSummary | null,
  thresholds: QueueAlertThresholds,
): QueueHealthAlert[] {
  if (!summary && !workerRunSummary) return [];

  const alerts: QueueHealthAlert[] = [];
  const failedCount = summary?.failed_count ?? 0;
  const pendingCount = summary?.pending_count ?? 0;
  const retryReadyCount = summary?.ready_to_retry_failed_count ?? 0;
  const runningCount = workerRunSummary?.running_count ?? 0;
  const processed24h = workerRunSummary?.processed_24h_count ?? 0;
  const failedItems24h = workerRunSummary?.failed_items_24h_count ?? 0;

  if (failedCount >= thresholds.failedBacklogCritical) {
    alerts.push({
      id: 'failed-backlog-critical',
      severity: 'critical',
      title: 'High failed email backlog',
      description: `${failedCount} queue items are currently in failed state.`,
      recommendation: 'Review provider errors, then requeue only after the root cause is fixed.',
    });
  }

  if (retryReadyCount >= thresholds.retryReadyWarning) {
    alerts.push({
      id: 'retry-ready-warning',
      severity: 'warning',
      title: 'Retry backlog is accumulating',
      description: `${retryReadyCount} failed items are ready to retry now.`,
      recommendation: 'Run the email worker and watch failure rate during reprocessing.',
    });
  }

  const oldestPendingMinutes = minutesSince(summary?.oldest_pending_at);
  if (
    pendingCount > 0 &&
    oldestPendingMinutes != null &&
    oldestPendingMinutes >= thresholds.oldestPendingWarningMinutes
  ) {
    alerts.push({
      id: 'oldest-pending-stale',
      severity: 'warning',
      title: 'Pending queue items are aging',
      description: `Oldest pending item is ${oldestPendingMinutes} minute${
        oldestPendingMinutes === 1 ? '' : 's'
      } old.`,
      recommendation: 'Check worker scheduling/health and queue processing throughput.',
    });
  }

  const latestCompletedMinutes = minutesSince(workerRunSummary?.latest_completed_at);
  if (
    (pendingCount > 0 || retryReadyCount > 0) &&
    runningCount === 0 &&
    (latestCompletedMinutes == null ||
      latestCompletedMinutes >= thresholds.noCompletionCriticalMinutes)
  ) {
    alerts.push({
      id: 'no-recent-worker-completion',
      severity: 'critical',
      title: 'No recent successful worker completion',
      description:
        latestCompletedMinutes == null
          ? 'Queue backlog exists, but no completed worker run has been recorded yet.'
          : `Queue backlog exists and the last completed worker run was ${latestCompletedMinutes} minutes ago.`,
      recommendation: 'Trigger the worker and verify scheduler/Edge Function execution.',
    });
  }

  if ((workerRunSummary?.failed_24h_count ?? 0) >= thresholds.workerRunFailuresWarning24h) {
    alerts.push({
      id: 'worker-run-failures-24h',
      severity: 'warning',
      title: 'Repeated worker run failures detected',
      description: `${workerRunSummary?.failed_24h_count ?? 0} worker runs failed in the last 24 hours.`,
      recommendation: 'Inspect worker run errors and provider credentials/config.',
    });
  }

  if (
    processed24h > 0 &&
    failedItems24h / processed24h >= thresholds.itemFailureRateWarning
  ) {
    const failureRatePct = Math.round((failedItems24h / processed24h) * 100);
    alerts.push({
      id: 'high-item-failure-rate',
      severity: 'warning',
      title: 'High email delivery failure rate',
      description: `${failureRatePct}% of processed queue items failed in the last 24 hours.`,
      recommendation: 'Validate provider health, recipient data quality, and rate limits.',
    });
  }

  if (
    workerRunSummary?.avg_duration_ms_24h != null &&
    workerRunSummary.avg_duration_ms_24h >= thresholds.avgDurationWarningMs
  ) {
    alerts.push({
      id: 'slow-worker-runs',
      severity: 'info',
      title: 'Worker runs are slower than expected',
      description: `Average worker run duration is ${Math.round(
        workerRunSummary.avg_duration_ms_24h,
      )} ms in the last 24 hours.`,
      recommendation: 'Monitor queue growth and provider latency before scaling workers.',
    });
  }

  return alerts;
}

function statusBadgeClass(status: string) {
  if (status === 'failed') return 'bg-red-500/15 text-red-700 border-red-500/20';
  if (status === 'pending') return 'bg-amber-500/15 text-amber-700 border-amber-500/20';
  if (status === 'processing') return 'bg-blue-500/15 text-blue-700 border-blue-500/20';
  if (status === 'sent') return 'bg-green-500/15 text-green-700 border-green-500/20';
  if (status === 'discarded') return 'bg-muted text-muted-foreground';
  return 'bg-muted text-muted-foreground';
}

function canRequeue(status: string) {
  return status !== 'sent';
}

function canDiscard(status: string) {
  return status !== 'sent' && status !== 'discarded';
}

function workerRunStatusBadgeClass(status: string) {
  if (status === 'failed') return 'bg-red-500/15 text-red-700 border-red-500/20';
  if (status === 'running') return 'bg-blue-500/15 text-blue-700 border-blue-500/20';
  if (status === 'completed') return 'bg-green-500/15 text-green-700 border-green-500/20';
  return 'bg-muted text-muted-foreground';
}

function QueueOpsRow({
  row,
  onRequeue,
  onDiscard,
  actionPending,
}: {
  row: NotificationQueueItemWithUser;
  onRequeue: (row: NotificationQueueItemWithUser) => Promise<void>;
  onDiscard: (row: NotificationQueueItemWithUser) => Promise<void>;
  actionPending: boolean;
}) {
  const userName = row.user_profile
    ? `${row.user_profile.first_name} ${row.user_profile.last_name}`.trim()
    : null;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={statusBadgeClass(row.status)}>
              {row.status}
            </Badge>
            <Badge variant="secondary">#{row.attempts} attempt{row.attempts === 1 ? '' : 's'}</Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {row.event_type}
            </Badge>
          </div>
          <p className="text-sm font-medium truncate">{row.subject}</p>
          <p className="text-xs text-muted-foreground break-all">
            {userName ? `${userName} · ` : ''}{row.recipient_email}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</p>
          <p>
            Next try:{' '}
            {row.status === 'sent'
              ? 'n/a'
              : formatDistanceToNow(new Date(row.next_attempt_at), { addSuffix: true })}
          </p>
          {row.leased_by && <p>Leased: {row.leased_by}</p>}
        </div>
      </div>

      {row.last_error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-700">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-medium">Last Error</span>
          </div>
          <p className="whitespace-pre-wrap break-words">{row.last_error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {canRequeue(row.status) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRequeue(row)}
            disabled={actionPending}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Requeue
          </Button>
        )}
        {canDiscard(row.status) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => void onDiscard(row)}
            disabled={actionPending}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Discard
          </Button>
        )}
      </div>
    </div>
  );
}

function WorkerRunRow({ row }: { row: NotificationEmailWorkerRunRow }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={workerRunStatusBadgeClass(row.run_status)}>
            {row.run_status}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {row.provider}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">{row.worker_id}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.started_at), { addSuffix: true })}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs text-muted-foreground">
        <span>Claimed: {row.claimed_count}</span>
        <span>Processed: {row.processed_count}</span>
        <span>Sent: {row.sent_count}</span>
        <span>Failed: {row.failed_count + row.discarded_count}</span>
      </div>
      {row.duration_ms != null && (
        <p className="text-xs text-muted-foreground">Duration: {row.duration_ms} ms</p>
      )}
      {row.error_message && (
        <p className="text-xs text-red-700 break-words line-clamp-2">{row.error_message}</p>
      )}
    </div>
  );
}

export function NotificationQueueOpsSection() {
  const { role } = useAuth();
  const [status, setStatus] = useState<NotificationQueueStatusFilter>('failed');
  const [queueAlertThresholds, setQueueAlertThresholds] = useState<QueueAlertThresholds>(
    loadQueueAlertThresholds,
  );
  const {
    summary,
    queueItems,
    workerRunSummary,
    workerRuns,
    deadLetterAnalytics,
    isLoading,
    isFetching,
    summaryError,
    listError,
    workerRunSummaryError,
    workerRunListError,
    deadLetterAnalyticsError,
    isRequeueing,
    isDiscarding,
    refetch,
    requeueItem,
    discardItem,
  } = useNotificationQueueOps(status, 30);

  const actionPending = isRequeueing || isDiscarding;

  const totalCount = useMemo(() => {
    if (!summary) return 0;
    return (
      summary.pending_count +
      summary.processing_count +
      summary.failed_count +
      summary.sent_count +
      summary.discarded_count
    );
  }, [summary]);

  const queueHealthAlerts = useMemo(
    () => buildQueueHealthAlerts(summary, workerRunSummary, queueAlertThresholds),
    [summary, workerRunSummary, queueAlertThresholds],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      QUEUE_ALERT_THRESHOLDS_STORAGE_KEY,
      JSON.stringify(queueAlertThresholds),
    );
  }, [queueAlertThresholds]);

  if (!canAccessAdminPage(role)) {
    return null;
  }

  const handleRequeue = async (row: NotificationQueueItemWithUser) => {
    try {
      await requeueItem(row.id, 0);
      toast({
        title: 'Queue item requeued',
        description: `Email notification for ${row.recipient_email} was requeued.`,
      });
    } catch (error) {
      console.error('Failed to requeue notification email:', error);
      toast({
        title: 'Unable to requeue item',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = async (row: NotificationQueueItemWithUser) => {
    try {
      await discardItem(row.id, 'discarded from HR Admin queue ops');
      toast({
        title: 'Queue item discarded',
        description: `Email notification for ${row.recipient_email} was discarded.`,
      });
    } catch (error) {
      console.error('Failed to discard notification email:', error);
      toast({
        title: 'Unable to discard item',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateThreshold = (key: keyof QueueAlertThresholds, nextValue: number) => {
    setQueueAlertThresholds((prev) =>
      sanitizeQueueAlertThresholds({
        ...prev,
        [key]: nextValue,
      }),
    );
  };

  const resetQueueAlertThresholds = () => {
    setQueueAlertThresholds(DEFAULT_QUEUE_ALERT_THRESHOLDS);
    toast({
      title: 'Queue alert thresholds reset',
      description: 'Queue health alerts are using the default thresholds again.',
    });
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5" />
              Notification Email Queue Ops
            </CardTitle>
            <CardDescription>
              Monitor queued email notifications, retry failures, and discard invalid jobs.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryError || listError || workerRunSummaryError || workerRunListError || deadLetterAnalyticsError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Failed to load queue operations data.
          </div>
        ) : null}

        {!summaryError && !listError && !workerRunSummaryError && !workerRunListError && !deadLetterAnalyticsError ? (
          <div className="space-y-2">
            {queueHealthAlerts.length > 0 ? (
              queueHealthAlerts.map((alert) => (
                <Alert
                  key={alert.id}
                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                  className={cn(
                    alert.severity === 'warning' &&
                      'border-amber-500/30 bg-amber-500/5 text-amber-800 [&>svg]:text-amber-700',
                    alert.severity === 'info' &&
                      'border-blue-500/20 bg-blue-500/5 text-blue-800 [&>svg]:text-blue-700',
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>
                    <p>{alert.description}</p>
                    {alert.recommendation ? (
                      <p className="mt-1 text-xs opacity-90">Recommended: {alert.recommendation}</p>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ))
            ) : (
              <Alert className="border-green-500/20 bg-green-500/5 text-green-800 [&>svg]:text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Queue health looks stable</AlertTitle>
                <AlertDescription>
                  No queue backlog or worker telemetry thresholds are currently breached.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}

        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Queue Health Alert Thresholds</p>
              <p className="text-xs text-muted-foreground">
                Local browser settings for this admin workstation. Does not change worker behavior.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={resetQueueAlertThresholds}>
              Reset Defaults
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Failed backlog (critical)</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={queueAlertThresholds.failedBacklogCritical}
                onChange={(e) => updateThreshold('failedBacklogCritical', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Retry-ready backlog (warning)</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={queueAlertThresholds.retryReadyWarning}
                onChange={(e) => updateThreshold('retryReadyWarning', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Oldest pending age (min)</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={queueAlertThresholds.oldestPendingWarningMinutes}
                onChange={(e) => updateThreshold('oldestPendingWarningMinutes', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">No completion age (critical min)</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={queueAlertThresholds.noCompletionCriticalMinutes}
                onChange={(e) => updateThreshold('noCompletionCriticalMinutes', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Worker run failures (24h)</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={queueAlertThresholds.workerRunFailuresWarning24h}
                onChange={(e) => updateThreshold('workerRunFailuresWarning24h', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Item failure rate % (warning)</label>
              <Input
                type="number"
                min={1}
                max={100}
                step={1}
                value={Math.round(queueAlertThresholds.itemFailureRateWarning * 100)}
                onChange={(e) =>
                  updateThreshold('itemFailureRateWarning', Number(e.target.value) / 100)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Avg duration (ms, info)</label>
              <Input
                type="number"
                min={100}
                step={100}
                value={queueAlertThresholds.avgDurationWarningMs}
                onChange={(e) => updateThreshold('avgDurationWarningMs', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Badge variant="secondary" className="justify-center py-2">Total: {totalCount}</Badge>
          <Badge variant="outline" className="justify-center py-2">Failed: {summary?.failed_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Pending: {summary?.pending_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Processing: {summary?.processing_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Retry Ready: {summary?.ready_to_retry_failed_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Discarded: {summary?.discarded_count ?? 0}</Badge>
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <p className="text-sm font-medium">Worker Telemetry (Last 24h)</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Badge variant="secondary" className="justify-center py-2">
              Running: {workerRunSummary?.running_count ?? 0}
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Completed: {workerRunSummary?.completed_24h_count ?? 0}
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Failed Runs: {workerRunSummary?.failed_24h_count ?? 0}
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Sent Items: {workerRunSummary?.sent_24h_count ?? 0}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs text-muted-foreground">
            <div>Claimed items: {workerRunSummary?.claimed_24h_count ?? 0}</div>
            <div>Processed items: {workerRunSummary?.processed_24h_count ?? 0}</div>
            <div>Failed items: {workerRunSummary?.failed_items_24h_count ?? 0}</div>
            <div>
              Avg duration:{' '}
              {workerRunSummary?.avg_duration_ms_24h == null
                ? 'n/a'
                : `${Math.round(workerRunSummary.avg_duration_ms_24h)} ms`}
            </div>
          </div>
          {workerRuns.length > 0 ? (
            <ScrollArea className="h-[220px]">
              <div className="space-y-2 pr-3">
                {workerRuns.map((row) => (
                  <WorkerRunRow key={row.id} row={row} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No worker runs recorded yet.
            </div>
          )}
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-medium">Dead-Letter Retry Analytics (Last 24h)</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Badge variant="secondary" className="justify-center py-2">
              Total: {deadLetterAnalytics?.dead_letter_count ?? 0}
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Failed: {deadLetterAnalytics?.failed_count ?? 0}
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Discarded: {deadLetterAnalytics?.discarded_count ?? 0}
            </Badge>
            <Badge variant="outline" className="justify-center py-2">
              Retry Ready: {deadLetterAnalytics?.retry_ready_failed_count ?? 0}
            </Badge>
          </div>

          {(deadLetterAnalytics?.dead_letter_count ?? 0) === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No failed/discarded email queue items in the analytics window.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">Top Providers</p>
                {deadLetterAnalytics?.providers?.length ? (
                  <div className="space-y-1">
                    {deadLetterAnalytics.providers.slice(0, 5).map((row) => (
                      <div key={row.provider} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium">{row.provider}</span>
                          <span className="text-muted-foreground">
                            {' '}({row.failed_count} failed, {row.discarded_count} discarded)
                          </span>
                        </div>
                        <Badge variant="outline">{row.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No provider analytics yet.</p>
                )}
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">Top Event Types</p>
                {deadLetterAnalytics?.event_types?.length ? (
                  <div className="space-y-1">
                    {deadLetterAnalytics.event_types.slice(0, 5).map((row) => (
                      <div key={row.event_type} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium">{row.event_type}</span>
                          <span className="text-muted-foreground">
                            {' '}({row.failed_count} failed, {row.discarded_count} discarded)
                          </span>
                        </div>
                        <Badge variant="outline">{row.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No event-type analytics yet.</p>
                )}
              </div>

              <div className="space-y-2 rounded-md border p-3 lg:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Top Failed/Discarded Error Fingerprints</p>
                {deadLetterAnalytics?.top_errors?.length ? (
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2 pr-2">
                      {deadLetterAnalytics.top_errors.map((row, index) => (
                        <div key={`${row.provider}-${row.event_type}-${index}`} className="rounded border p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline">{row.provider}</Badge>
                              <Badge variant="secondary">{row.event_type}</Badge>
                              <span className="text-muted-foreground">
                                Count: {row.count} · Max attempts: {row.max_attempts}
                              </span>
                            </div>
                            {row.latest_seen_at ? (
                              <span className="text-[11px] text-muted-foreground">
                                {formatDistanceToNow(new Date(row.latest_seen_at), { addSuffix: true })}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground break-words line-clamp-2">
                            {row.error_fingerprint}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground">No error fingerprints recorded yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <Tabs value={status} onValueChange={(value) => setStatus(value as NotificationQueueStatusFilter)}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            {FILTERS.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>{filter.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading queue items...
          </div>
        ) : queueItems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No email queue items found for the selected filter.
          </div>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="space-y-3 pr-3">
              {queueItems.map((row) => (
                <QueueOpsRow
                  key={row.id}
                  row={row}
                  onRequeue={handleRequeue}
                  onDiscard={handleDiscard}
                  actionPending={actionPending}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
