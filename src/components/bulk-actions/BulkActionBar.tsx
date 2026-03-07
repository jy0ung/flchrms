import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { BulkActionBarProps } from './types';

export function BulkActionBar<TItem, TId extends string>({
  items,
  selectedIds,
  getItemId,
  actions,
  onClearSelection,
  className,
}: BulkActionBarProps<TItem, TId>) {
  if (selectedIds.length === 0) {
    return null;
  }

  const selectedIdSet = new Set(selectedIds);
  const selectedItems = items.filter((item) => selectedIdSet.has(getItemId(item)));
  const visibleActions = actions.filter((action) => action.isVisible?.(selectedItems) ?? true);

  return (
    <Card className={cn('border-border/80 shadow-sm', className)}>
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">{selectedItems.length} selected</Badge>
          <span className="text-muted-foreground">Bulk actions apply to the current selection.</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const disabled = action.isDisabled?.(selectedItems) ?? false;

            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={disabled}
                onClick={() => {
                  void action.onExecute(selectedItems);
                }}
              >
                {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                {action.label}
              </Button>
            );
          })}

          <Button variant="ghost" size="sm" className="rounded-full" onClick={onClearSelection}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
