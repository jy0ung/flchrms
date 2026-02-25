import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BellRing, Loader2, RefreshCw, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationQueueOps, type NotificationQueueItemWithUser, type NotificationQueueStatusFilter } from '@/hooks/useNotificationQueueOps';
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

export function NotificationQueueOpsSection() {
  const { role } = useAuth();
  const [status, setStatus] = useState<NotificationQueueStatusFilter>('failed');
  const {
    summary,
    queueItems,
    isLoading,
    isFetching,
    summaryError,
    listError,
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

  return (
    <Card>
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
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryError || listError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Failed to load queue operations data.
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Badge variant="secondary" className="justify-center py-2">Total: {totalCount}</Badge>
          <Badge variant="outline" className="justify-center py-2">Failed: {summary?.failed_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Pending: {summary?.pending_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Processing: {summary?.processing_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Retry Ready: {summary?.ready_to_retry_failed_count ?? 0}</Badge>
          <Badge variant="outline" className="justify-center py-2">Discarded: {summary?.discarded_count ?? 0}</Badge>
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
