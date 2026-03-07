import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WorkspaceStatePanelProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  align?: 'center' | 'start';
  appearance?: 'default' | 'dashed';
  animateIcon?: boolean;
}

export function WorkspaceStatePanel({
  title,
  description,
  icon: Icon = AlertCircle,
  action,
  className,
  align = 'center',
  appearance = 'dashed',
  animateIcon = false,
}: WorkspaceStatePanelProps) {
  return (
    <Card
      className={cn(
        'border-border/70 shadow-sm',
        appearance === 'dashed' ? 'border-dashed' : '',
        className,
      )}
    >
      <CardContent
        className={cn(
          'flex flex-col gap-3 p-6',
          align === 'center' ? 'items-center py-10 text-center' : 'items-start',
        )}
      >
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Icon className={cn('h-5 w-5', animateIcon ? 'animate-spin' : '')} />
        </div>
        <div className={cn('space-y-1', align === 'center' ? 'max-w-md' : '')}>
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div>{action}</div> : null}
      </CardContent>
    </Card>
  );
}
