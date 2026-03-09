import * as React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RecordSurfaceHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function RecordSurfaceHeader({
  title,
  description,
  meta,
  actions,
  className,
  ...props
}: RecordSurfaceHeaderProps) {
  return (
    <Card className={cn('border-border/70 shadow-sm', className)} {...props}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {meta ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
