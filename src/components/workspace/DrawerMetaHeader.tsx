import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DrawerMetaItem {
  id: string;
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
}

interface DrawerMetaHeaderProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  badges?: React.ReactNode;
  leading?: React.ReactNode;
  supportingText?: React.ReactNode;
  metaItems?: DrawerMetaItem[];
  className?: string;
}

export function DrawerMetaHeader({
  title,
  description,
  badges,
  leading,
  supportingText,
  metaItems = [],
  className,
}: DrawerMetaHeaderProps) {
  return (
    <Card className={cn('border-border/70 bg-muted/20 shadow-sm', className)}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-4">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0 flex-1">
            {badges ? (
              <div className="flex flex-wrap items-center gap-2">{badges}</div>
            ) : null}
            {title ? (
              <h3 className={cn('text-lg font-semibold', badges ? 'mt-2' : '')}>{title}</h3>
            ) : null}
            {description ? (
              <p className={cn('text-sm text-muted-foreground', title || badges ? 'mt-1' : '')}>
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {metaItems.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {metaItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/70 bg-background/80 px-3 py-2"
                >
                  <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                    {item.label}
                  </p>
                  <div className="mt-1 text-sm font-medium text-foreground">{item.value}</div>
                </div>
              );
            })}
          </div>
        ) : null}

        {supportingText ? (
          <p className="text-xs text-muted-foreground">{supportingText}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
