import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useBulkSelection } from '@/hooks/useBulkSelection';

describe('useBulkSelection', () => {
  it('keeps only visible ids when the item set changes', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useBulkSelection(items, (item: { id: string }) => item.id),
      {
        initialProps: {
          items: [
            { id: 'one' },
            { id: 'two' },
          ],
        },
      },
    );

    act(() => {
      result.current.setSelectedIds(['one', 'two']);
    });

    rerender({ items: [{ id: 'one' }] });

    expect(result.current.selectedIds).toEqual(['one']);
    expect(result.current.selectedItems).toEqual([{ id: 'one' }]);
  });
});
