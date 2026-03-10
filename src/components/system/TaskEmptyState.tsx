import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

import { cn } from '@/lib/utils';

interface TaskEmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  align?: 'center' | 'start';
  compact?: boolean;
}

export function TaskEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
  align = 'center',
  compact = false,
}: TaskEmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border bg-muted/50',
        compact ? 'p-4' : 'p-5',
        align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      <div
        className={cn(
          'flex gap-3',
          align === 'center' ? 'flex-col items-center justify-center' : 'items-start',
        )}
      >
        <div className="rounded-full bg-background p-2 text-muted-foreground">
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
        <div className={cn('space-y-1', align === 'center' ? 'max-w-sm' : 'flex-1')}>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className={cn('mt-3', align === 'center' ? 'flex justify-center' : '')}>{action}</div>
      ) : null}
    </div>
  );
}
