import type { LucideIcon } from 'lucide-react';

export interface BulkActionDescriptor<TItem, TId extends string> {
  id: string;
  label: string;
  icon?: LucideIcon;
  isVisible?: (items: TItem[]) => boolean;
  isDisabled?: (items: TItem[]) => boolean;
  onExecute: (items: TItem[]) => void | Promise<void>;
}

export interface BulkActionBarProps<TItem, TId extends string> {
  items: TItem[];
  selectedIds: TId[];
  getItemId: (item: TItem) => TId;
  actions: BulkActionDescriptor<TItem, TId>[];
  onClearSelection: () => void;
  className?: string;
}
