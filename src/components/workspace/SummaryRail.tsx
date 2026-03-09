import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SummaryRailTone = 'default' | 'success' | 'warning' | 'info';
export type SummaryRailVariant = 'contained' | 'cards';

export interface SummaryRailItem {
  id: string;
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  tone?: SummaryRailTone;
}

interface SummaryRailProps {
  items: SummaryRailItem[];
  className?: string;
  variant?: SummaryRailVariant;
}

const TONE_CLASSES: Record<SummaryRailTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-700',
  warning: 'bg-amber-500/10 text-amber-700',
  info: 'bg-sky-500/10 text-sky-700',
};

function SummaryRailCard({ item }: { item: SummaryRailItem }) {
  const Icon = item.icon;
  const tone = item.tone ?? 'default';

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
          {item.helper ? (
            <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
          ) : null}
        </div>

        {Icon ? (
          <div className={cn('rounded-2xl p-3', TONE_CLASSES[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryRailContained({ items, className }: { items: SummaryRailItem[]; className?: string }) {
  return (
    <Card className={cn('border-border/70 shadow-sm', className)}>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          const tone = item.tone ?? 'default';

          return (
            <div
              key={item.id}
              className={cn(
                'space-y-1 rounded-xl border border-border/70 bg-muted/20 px-3 py-3',
                index === items.length - 1 && items.length % 2 !== 0 && 'sm:col-span-2 xl:col-span-1',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-xl font-semibold tracking-tight text-foreground">{item.value}</p>
                </div>

                {Icon ? (
                  <div className={cn('rounded-xl p-2', TONE_CLASSES[tone])}>
                    <Icon className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
              {item.helper ? (
                <p className="text-sm text-muted-foreground">{item.helper}</p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function SummaryRail({
  items,
  className,
  variant = 'contained',
}: SummaryRailProps) {
  if (items.length === 0) {
    return null;
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>
        {items.map((item) => (
          <SummaryRailCard key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return <SummaryRailContained items={items} className={className} />;
}

export type { SummaryRailProps };
