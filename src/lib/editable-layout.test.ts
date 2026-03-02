import { describe, expect, it } from 'vitest';

import {
  addLayoutItem,
  buildLayoutStateFromOrder,
  compactLayoutItems,
  mergeLayoutStateWithIds,
  moveLayoutItem,
  removeLayoutItem,
  setLayoutItemWidth,
  sortLayoutItems,
  type LayoutState,
} from '@/lib/editable-layout';

describe('editable-layout', () => {
  it('compacts holes deterministically', () => {
    const items = compactLayoutItems([
      { id: 'a', x: 0, y: 0, w: 4, h: 1 },
      { id: 'b', x: 8, y: 0, w: 4, h: 1 },
      { id: 'c', x: 0, y: 2, w: 4, h: 1 },
    ]);

    const ordered = sortLayoutItems(items);
    expect(ordered.map((item) => item.id)).toEqual(['a', 'c', 'b']);
    expect(ordered[0]).toMatchObject({ id: 'a', x: 0, y: 0 });
    expect(ordered[1]).toMatchObject({ id: 'c', x: 4, y: 0 });
    expect(ordered[2]).toMatchObject({ id: 'b', x: 8, y: 0 });
  });

  it('builds layout from legacy order and dimensions', () => {
    const state = buildLayoutStateFromOrder(
      ['one', 'two', 'three'],
      {
        one: { w: 8, h: 1 },
        two: { w: 4, h: 1 },
        three: { w: 12, h: 1 },
      },
    );

    const ordered = sortLayoutItems(state.items);
    expect(ordered.map((item) => item.id)).toEqual(['one', 'two', 'three']);
    expect(ordered[0]).toMatchObject({ x: 0, y: 0, w: 8 });
    expect(ordered[1]).toMatchObject({ x: 8, y: 0, w: 4 });
    expect(ordered[2]).toMatchObject({ x: 0, y: 1, w: 12 });
  });

  it('moves and resizes without creating collisions', () => {
    const base = buildLayoutStateFromOrder(
      ['one', 'two', 'three'],
      {
        one: { w: 4, h: 1 },
        two: { w: 4, h: 1 },
        three: { w: 4, h: 1 },
      },
    );

    const moved = moveLayoutItem(base, 'one', 'three');
    expect(sortLayoutItems(moved.items).map((item) => item.id)).toEqual(['two', 'three', 'one']);

    const resized = setLayoutItemWidth(moved, 'two', 12);
    const resizedOrdered = sortLayoutItems(resized.items);
    expect(resizedOrdered.find((item) => item.id === 'two')?.w).toBe(12);
  });

  it('merges persisted layout with current ids and preserves known positions', () => {
    const persisted: LayoutState = {
      version: 1,
      items: [
        { id: 'one', x: 8, y: 3, w: 4, h: 1 },
        { id: 'two', x: 0, y: 0, w: 8, h: 1 },
      ],
    };

    const merged = mergeLayoutStateWithIds(
      persisted,
      ['two', 'three', 'one'],
      {
        two: { w: 8, h: 1 },
        three: { w: 4, h: 1 },
        one: { w: 4, h: 1 },
      },
    );

    expect(sortLayoutItems(merged.items).map((item) => item.id)).toEqual(['two', 'three', 'one']);
  });

  it('adds and removes layout items safely', () => {
    const base = buildLayoutStateFromOrder(['one'], { one: { w: 4, h: 1 } });
    const added = addLayoutItem(base, { id: 'two', x: 8, y: 4, w: 4, h: 1 });
    expect(added.items.find((item) => item.id === 'two')).toBeTruthy();

    const removed = removeLayoutItem(added, 'one');
    expect(removed.items.find((item) => item.id === 'one')).toBeFalsy();
  });
});
