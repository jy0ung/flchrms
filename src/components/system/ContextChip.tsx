import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const contextChipVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
  {
    variants: {
      tone: {
        default: 'border-border bg-background text-foreground',
        muted: 'border-border/70 bg-muted/40 text-muted-foreground',
        info: 'border-primary/20 bg-primary/5 text-primary',
        success: 'border-success/20 bg-success/8 text-success',
        warning: 'border-warning/25 bg-warning/10 text-warning-foreground',
      },
    },
    defaultVariants: {
      tone: 'muted',
    },
  },
);

export interface ContextChipProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof contextChipVariants> {
  icon?: ReactNode;
}

export function ContextChip({ className, tone, icon, children, ...props }: ContextChipProps) {
  return (
    <span className={cn(contextChipVariants({ tone }), className)} {...props}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
