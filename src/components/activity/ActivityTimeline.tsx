import { format, formatDistanceToNowStrict } from 'date-fns';
import { Activity, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ActivityTimelineItem, ActivityTimelineKind } from './types';

interface ActivityTimelineProps {
  items: ActivityTimelineItem[];
  isLoading?: boolean;
  title: string;
  emptyMessage: string;
  loadingMessage?: string;
  timeDisplay?: 'relative' | 'datetime';
  formatTimestamp?: (value: string) => string;
}

const KIND_LABELS: Record<ActivityTimelineKind, string> = {
  create: 'Created',
  update: 'Updated',
  approval: 'Approval',
  rejection: 'Rejected',
  status_change: 'Status',
  document: 'Document',
  custom: 'Activity',
};

function formatTimestamp(value: string, timeDisplay: ActivityTimelineProps['timeDisplay']) {
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    if (timeDisplay === 'relative') {
      return formatDistanceToNowStrict(parsed, { addSuffix: true });
    }
    return format(parsed, 'PPp');
  } catch {
    return value;
  }
}

export function ActivityTimeline({
  items,
  isLoading = false,
  title,
  emptyMessage,
  loadingMessage = 'Loading activity...',
  timeDisplay = 'datetime',
  formatTimestamp: formatTimestampOverride,
}: ActivityTimelineProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingMessage}
          </div>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <div className="relative space-y-0">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {items.map((item, index) => (
              <div key={item.id} className={`relative flex gap-3 ${index === items.length - 1 ? 'pb-0' : 'pb-4'}`}>
                <div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                </div>

                <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {KIND_LABELS[item.kind]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestampOverride ? formatTimestampOverride(item.at) : formatTimestamp(item.at, timeDisplay)}
                    </p>
                  </div>

                  {item.actorLabel ? (
                    <p className="mt-1 text-xs text-muted-foreground">By {item.actorLabel}</p>
                  ) : null}

                  {item.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
