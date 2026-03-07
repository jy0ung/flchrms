import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type WorkspaceMetricTone = 'default' | 'success' | 'warning' | 'info';

export interface WorkspaceMetricItem {
  id: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  tone?: WorkspaceMetricTone;
}

interface WorkspaceMetricStripProps {
  items: WorkspaceMetricItem[];
  className?: string;
}

const TONE_CLASSES: Record<WorkspaceMetricTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-700',
  warning: 'bg-amber-500/10 text-amber-700',
  info: 'bg-sky-500/10 text-sky-700',
};

export function WorkspaceMetricStrip({ items, className }: WorkspaceMetricStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? 'default';

        return (
          <Card key={item.id} className="border-border/70 shadow-sm">
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                {item.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
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
      })}
    </div>
  );
}
