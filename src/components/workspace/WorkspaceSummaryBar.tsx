import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WorkspaceSummaryItem {
  id: string;
  label: string;
  value: string | number;
  helper?: string;
}

interface WorkspaceSummaryBarProps {
  items: WorkspaceSummaryItem[];
  className?: string;
}

export function WorkspaceSummaryBar({ items, className }: WorkspaceSummaryBarProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className={cn('border-border/70 shadow-sm', className)}>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              'space-y-1 rounded-xl border border-border/70 bg-muted/20 px-3 py-3',
              index === items.length - 1 && items.length % 2 !== 0 && 'sm:col-span-2 xl:col-span-1',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </p>
            <p className="text-xl font-semibold tracking-tight text-foreground">{item.value}</p>
            {item.helper ? (
              <p className="text-sm text-muted-foreground">{item.helper}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
