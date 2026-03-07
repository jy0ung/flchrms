import { useCallback, useEffect, useMemo, useState } from 'react';

export function useBulkSelection<TItem, TId extends string>(
  items: TItem[] | undefined,
  getItemId: (item: TItem) => TId,
) {
  const [selectedIds, setSelectedIds] = useState<TId[]>([]);

  useEffect(() => {
    const visibleIds = new Set((items ?? []).map(getItemId));
    setSelectedIds((current) => {
      const next = current.filter((id) => visibleIds.has(id));
      const unchanged =
        next.length === current.length && next.every((id, index) => id === current[index]);

      return unchanged ? current : next;
    });
  }, [getItemId, items]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedItems = useMemo(
    () => (items ?? []).filter((item) => selectedIdSet.has(getItemId(item))),
    [getItemId, items, selectedIdSet],
  );

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  return {
    selectedIds,
    setSelectedIds,
    selectedIdSet,
    selectedItems,
    selectedCount: selectedIds.length,
    clearSelection,
  };
}
