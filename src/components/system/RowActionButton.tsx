import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const toneClassNames = {
  default: 'border-border/60 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  success:
    'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800',
  warning:
    'border-amber-500/20 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800',
  danger:
    'border-rose-500/20 bg-rose-500/5 text-rose-700 hover:bg-rose-500/10 hover:text-rose-800',
} as const;

export interface RowActionButtonProps extends Omit<ButtonProps, 'size' | 'variant'> {
  tone?: keyof typeof toneClassNames;
}

export const RowActionButton = React.forwardRef<HTMLButtonElement, RowActionButtonProps>(
  ({ tone = 'default', className, ...props }, ref) => (
    <Button
      ref={ref}
      size="sm"
      variant="outline"
      className={cn(
        'h-8 rounded-full px-3 text-xs font-medium shadow-none',
        toneClassNames[tone],
        className,
      )}
      {...props}
    />
  ),
);

RowActionButton.displayName = 'RowActionButton';
