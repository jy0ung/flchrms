import * as React from 'react';

import { cn } from '@/lib/utils';

interface DashboardSectionProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  contentClassName?: string;
}

export function DashboardSection({
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
  ...props
}: DashboardSectionProps) {
  const titleId = React.useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn('space-y-3 md:space-y-4', className)}
      {...props}
    >
      <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="hidden max-w-3xl text-sm text-muted-foreground lg:block">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
