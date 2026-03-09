import { AlertCircle, FileText, MessageSquare, RefreshCcw, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeaveRequest } from '@/types/hrms';

type LeaveRequestContextMode = 'compact' | 'full';

type ContextTone = 'muted' | 'info' | 'warning' | 'danger' | 'accent';

interface LeaveRequestContextSummaryProps {
  request: LeaveRequest;
  mode?: LeaveRequestContextMode;
  attentionLabel?: string | null;
}

interface LeaveRequestContextEntry {
  id: string;
  label: string;
  value: string;
  icon: typeof MessageSquare;
  tone: ContextTone;
}

const toneClasses: Record<ContextTone, string> = {
  muted: 'border-border/70 bg-muted/30 text-muted-foreground',
  info: 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300',
  warning: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  danger: 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300',
  accent: 'border-violet-500/20 bg-violet-500/5 text-violet-700 dark:text-violet-300',
};

function buildContextEntries(request: LeaveRequest): LeaveRequestContextEntry[] {
  const entries: LeaveRequestContextEntry[] = [];

  if (request.rejection_reason) {
    entries.push({
      id: 'rejection',
      label: 'Rejection reason',
      value: request.rejection_reason,
      icon: XCircle,
      tone: 'danger',
    });
  }

  if (request.cancellation_rejection_reason) {
    entries.push({
      id: 'cancellation-rejection',
      label: 'Cancellation rejection',
      value: request.cancellation_rejection_reason,
      icon: XCircle,
      tone: 'danger',
    });
  }

  if (request.cancellation_reason) {
    entries.push({
      id: 'cancellation-request',
      label: 'Cancellation request',
      value: request.cancellation_reason,
      icon: AlertCircle,
      tone: 'warning',
    });
  }

  if (request.amendment_notes) {
    entries.push({
      id: 'amendment',
      label: 'Amendment notes',
      value: request.amendment_notes,
      icon: RefreshCcw,
      tone: 'accent',
    });
  }

  if (request.manager_comments) {
    entries.push({
      id: 'manager-comments',
      label: 'Approver comments',
      value: request.manager_comments,
      icon: MessageSquare,
      tone: 'info',
    });
  }

  return entries;
}

export function LeaveRequestContextSummary({
  request,
  mode = 'compact',
  attentionLabel,
}: LeaveRequestContextSummaryProps) {
  const contextEntries = buildContextEntries(request);
  const visibleEntries = mode === 'compact' ? contextEntries.slice(0, 2) : contextEntries;
  const hiddenEntryCount = contextEntries.length - visibleEntries.length;

  return (
    <div className="space-y-3">
      {attentionLabel ? (
        <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]">
          {attentionLabel}
        </Badge>
      ) : null}

      <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Request note
        </p>
        <p className={cn('mt-1 text-sm leading-6 text-foreground', mode === 'compact' ? 'line-clamp-3' : undefined)}>
          {request.reason || 'No request note provided.'}
        </p>
      </div>

      {visibleEntries.length > 0 ? (
        <div className="space-y-2">
          {visibleEntries.map((entry) => {
            const Icon = entry.icon;

            return (
              <div
                key={entry.id}
                className={cn(
                  'rounded-xl border px-3 py-3',
                  toneClasses[entry.tone],
                )}
              >
                <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em]">
                  <Icon className="h-3.5 w-3.5" />
                  {entry.label}
                </p>
                <p className={cn('mt-1 text-sm leading-6 text-foreground/90', mode === 'compact' ? 'line-clamp-2' : undefined)}>
                  {entry.value}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No additional workflow notes recorded.
        </p>
      )}

      {mode === 'compact' && hiddenEntryCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          +{hiddenEntryCount} more workflow update{hiddenEntryCount === 1 ? '' : 's'} in request details
        </p>
      ) : null}
    </div>
  );
}
