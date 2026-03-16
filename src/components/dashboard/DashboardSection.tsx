import * as React from 'react';

import { cn } from '@/lib/utils';

interface DashboardSectionProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'default' | 'priority' | 'subtle';
  contentClassName?: string;
}

export function DashboardSection({
  title,
  description,
  eyebrow,
  actions,
  variant = 'default',
  className,
  contentClassName,
  children,
  ...props
}: DashboardSectionProps) {
  const titleId = React.useId();
  const isElevated = variant !== 'default';

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'space-y-3 md:space-y-4',
        variant === 'priority' && 'rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-background p-4 shadow-sm md:p-5',
        variant === 'subtle' && 'rounded-3xl border border-border/60 bg-muted/[0.18] p-4 md:p-5',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-x-6',
          isElevated ? 'border-b border-border/60 pb-3' : 'border-b border-border/70 pb-3',
        )}
      >
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.18em]',
                variant === 'priority' ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            id={titleId}
            className={cn(
              'font-semibold tracking-tight text-foreground',
              variant === 'priority' ? 'text-xl' : 'text-lg',
            )}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={cn(
                'max-w-3xl text-sm text-muted-foreground',
                variant === 'default' ? 'hidden lg:block' : 'block',
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
