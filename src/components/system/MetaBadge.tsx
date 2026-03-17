import type { HTMLAttributes, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const toneClassNames = {
  default: 'border-border/70 bg-muted/20 text-muted-foreground',
  info: 'border-sky-200/70 bg-sky-50/70 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200',
  success:
    'border-emerald-200/70 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200',
  warning:
    'border-amber-200/70 bg-amber-50/70 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200',
  danger:
    'border-rose-200/70 bg-rose-50/70 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200',
} as const;

export interface MetaBadgeProps extends HTMLAttributes<HTMLDivElement> {
  tone?: keyof typeof toneClassNames;
  icon?: ReactNode;
}

export function MetaBadge({
  tone = 'default',
  icon,
  className,
  children,
  ...props
}: MetaBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-normal',
        toneClassNames[tone],
        className,
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </Badge>
  );
}
