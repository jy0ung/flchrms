export const EDITABLE_LAYOUT_VERSION = 1;
export const EDITABLE_LAYOUT_COLUMNS = 12;

export type LayoutItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutState = {
  version: number;
  items: LayoutItem[];
};

export type LayoutDimensionsById = Record<string, { w: number; h: number }>;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sanitizeLayoutItem(item: LayoutItem, columns: number): LayoutItem {
  const w = clamp(Math.round(item.w || 1), 1, columns);
  const h = Math.max(1, Math.round(item.h || 1));
  const x = clamp(Math.round(item.x || 0), 0, Math.max(0, columns - w));
  const y = Math.max(0, Math.round(item.y || 0));
  return { id: item.id, x, y, w, h };
}

function collides(a: LayoutItem, b: LayoutItem): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function canPlace(candidate: LayoutItem, placed: LayoutItem[]): boolean {
  return placed.every((item) => !collides(candidate, item));
}

function findPlacement(
  draft: LayoutItem,
  placed: LayoutItem[],
  columns: number,
): Pick<LayoutItem, "x" | "y"> {
  const preferredX = clamp(draft.x, 0, Math.max(0, columns - draft.w));
  const maxX = Math.max(0, columns - draft.w);

  for (let y = 0; y < 500; y += 1) {
    const preferredCandidate: LayoutItem = { ...draft, x: preferredX, y };
    if (canPlace(preferredCandidate, placed)) {
      return { x: preferredCandidate.x, y: preferredCandidate.y };
    }

    for (let x = 0; x <= maxX; x += 1) {
      const candidate: LayoutItem = { ...draft, x, y };
      if (canPlace(candidate, placed)) {
        return { x: candidate.x, y: candidate.y };
      }
    }
  }

  return { x: 0, y: 0 };
}

export function sortLayoutItems(items: LayoutItem[]): LayoutItem[] {
  return [...items].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.id.localeCompare(b.id);
  });
}

export function compactLayoutItems(items: LayoutItem[], columns = EDITABLE_LAYOUT_COLUMNS): LayoutItem[] {
  const ordered = sortLayoutItems(items.map((item) => sanitizeLayoutItem(item, columns)));
  const placed: LayoutItem[] = [];

  for (const item of ordered) {
    const placement = findPlacement(item, placed, columns);
    placed.push({ ...item, ...placement });
  }

  return sortLayoutItems(placed);
}

export function compactLayoutState(state: LayoutState, columns = EDITABLE_LAYOUT_COLUMNS): LayoutState {
  return {
    version: EDITABLE_LAYOUT_VERSION,
    items: compactLayoutItems(state.items, columns),
  };
}

export function buildLayoutStateFromOrder(
  orderedIds: string[],
  dimensionsById: LayoutDimensionsById,
  columns = EDITABLE_LAYOUT_COLUMNS,
): LayoutState {
  const seeded = orderedIds.map((id, index) => {
    const dims = dimensionsById[id] ?? { w: 4, h: 1 };
    return {
      id,
      x: 0,
      y: index,
      w: clamp(Math.round(dims.w), 1, columns),
      h: Math.max(1, Math.round(dims.h)),
    } satisfies LayoutItem;
  });

  return {
    version: EDITABLE_LAYOUT_VERSION,
    items: compactLayoutItems(seeded, columns),
  };
}

export function mergeLayoutStateWithIds(
  existing: LayoutState | null,
  orderedIds: string[],
  dimensionsById: LayoutDimensionsById,
  columns = EDITABLE_LAYOUT_COLUMNS,
): LayoutState {
  if (!existing || !Array.isArray(existing.items)) {
    return buildLayoutStateFromOrder(orderedIds, dimensionsById, columns);
  }

  const existingById = new Map(existing.items.map((item) => [item.id, sanitizeLayoutItem(item, columns)]));
  const merged: LayoutItem[] = [];

  for (const id of orderedIds) {
    const existingItem = existingById.get(id);
    const dims = dimensionsById[id] ?? { w: 4, h: 1 };
    if (existingItem) {
      merged.push({
        ...existingItem,
        w: clamp(Math.round(existingItem.w), 1, columns),
        h: Math.max(1, Math.round(existingItem.h)),
      });
      continue;
    }
    merged.push({
      id,
      x: 0,
      y: merged.length,
      w: clamp(Math.round(dims.w), 1, columns),
      h: Math.max(1, Math.round(dims.h)),
    });
  }

  return {
    version: EDITABLE_LAYOUT_VERSION,
    items: compactLayoutItems(merged, columns),
  };
}

export function moveLayoutItem(
  state: LayoutState,
  sourceId: string,
  targetId: string,
  columns = EDITABLE_LAYOUT_COLUMNS,
): LayoutState {
  if (sourceId === targetId) return compactLayoutState(state, columns);
  const ordered = sortLayoutItems(state.items).map((item) => item.id);
  const sourceIndex = ordered.indexOf(sourceId);
  const targetIndex = ordered.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return compactLayoutState(state, columns);

  const nextOrder = [...ordered];
  const [removed] = nextOrder.splice(sourceIndex, 1);
  nextOrder.splice(targetIndex, 0, removed);

  const itemById = new Map(state.items.map((item) => [item.id, item]));
  const dimensionsById: LayoutDimensionsById = {};
  for (const id of nextOrder) {
    const item = itemById.get(id);
    dimensionsById[id] = { w: item?.w ?? 4, h: item?.h ?? 1 };
  }

  return buildLayoutStateFromOrder(nextOrder, dimensionsById, columns);
}

export function setLayoutItemWidth(
  state: LayoutState,
  itemId: string,
  width: number,
  columns = EDITABLE_LAYOUT_COLUMNS,
): LayoutState {
  const nextItems = state.items.map((item) =>
    item.id === itemId ? { ...item, w: clamp(Math.round(width), 1, columns) } : item,
  );
  return compactLayoutState({ version: EDITABLE_LAYOUT_VERSION, items: nextItems }, columns);
}

export function removeLayoutItem(
  state: LayoutState,
  itemId: string,
  columns = EDITABLE_LAYOUT_COLUMNS,
): LayoutState {
  return compactLayoutState(
    {
      version: EDITABLE_LAYOUT_VERSION,
      items: state.items.filter((item) => item.id !== itemId),
    },
    columns,
  );
}

export function addLayoutItem(
  state: LayoutState,
  item: LayoutItem,
  columns = EDITABLE_LAYOUT_COLUMNS,
): LayoutState {
  const exists = state.items.some((current) => current.id === item.id);
  const next = exists
    ? state.items.map((current) => (current.id === item.id ? item : current))
    : [...state.items, item];
  return compactLayoutState({ version: EDITABLE_LAYOUT_VERSION, items: next }, columns);
}

