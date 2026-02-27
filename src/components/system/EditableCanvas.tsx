import * as React from 'react';

import { LayoutTile } from '@/components/system/LayoutTile';
import { type InteractionMode } from '@/components/system/interaction-mode';
import {
  EDITABLE_LAYOUT_COLUMNS,
  compactLayoutState,
  moveLayoutItem,
  setLayoutItemWidth,
  sortLayoutItems,
  type LayoutState,
} from '@/lib/editable-layout';
import { cn } from '@/lib/utils';

export interface EditableCanvasItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  view: React.ReactNode;
}

type ResizeRule = { minW: number; maxW: number; step: number };

export interface EditableCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: InteractionMode;
  items: EditableCanvasItem[];
  layoutState: LayoutState;
  onLayoutStateChange: (nextState: LayoutState) => void;
  onHideItem?: (itemId: string) => void;
  columns?: number;
  widthSteps?: readonly number[];
  rowHeightClassName?: string;
  ariaLabel?: string;
  variant?: 'legacy' | 'enterprise';
  resizeRulesById?: Record<string, ResizeRule>;
  reorderScopeById?: Record<string, string>;
  onInvalidDropScope?: (sourceId: string, targetId: string) => void;
  enableKeyboardResize?: boolean;
}

function cssGridVars(item: { x: number; y: number; w: number; h: number }): React.CSSProperties {
  return {
    ['--editable-col-start' as string]: `${item.x + 1}`,
    ['--editable-col-span' as string]: `${item.w}`,
    ['--editable-row-start' as string]: `${item.y + 1}`,
    ['--editable-row-span' as string]: `${item.h}`,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function resolveResizeWidth(rawWidth: number, rule?: ResizeRule): number {
  if (!rule) {
    return Math.max(1, Math.round(rawWidth));
  }
  const step = Math.max(1, Math.round(rule.step || 1));
  const rounded = Math.round(rawWidth);
  const clamped = clamp(rounded, rule.minW, rule.maxW);
  const snapped = rule.minW + Math.round((clamped - rule.minW) / step) * step;
  return clamp(snapped, rule.minW, rule.maxW);
}

interface ActiveResizeState {
  itemId: string;
  startX: number;
  startWidth: number;
  columnWidth: number;
}

/**
 * Reusable layout canvas for view/customize representations.
 * Uses one deterministic layout model and compaction engine for both modes.
 */
export function EditableCanvas({
  mode,
  items,
  layoutState,
  onLayoutStateChange,
  onHideItem,
  columns = EDITABLE_LAYOUT_COLUMNS,
  widthSteps = [4, 8, 12],
  rowHeightClassName = 'xl:auto-rows-[92px]',
  ariaLabel = 'Editable canvas',
  variant = 'legacy',
  resizeRulesById,
  reorderScopeById,
  onInvalidDropScope,
  enableKeyboardResize = false,
  className,
  ...props
}: EditableCanvasProps) {
  const isEnterprise = variant === 'enterprise';
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [previewWidthById, setPreviewWidthById] = React.useState<Record<string, number>>({});
  const previewWidthByIdRef = React.useRef<Record<string, number>>({});
  const activeResizeRef = React.useRef<ActiveResizeState | null>(null);

  const itemById = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const visibleLayoutItems = React.useMemo(
    () =>
      sortLayoutItems(
        compactLayoutState(layoutState, columns).items.filter((layoutItem) => itemById.has(layoutItem.id)),
      ),
    [columns, itemById, layoutState],
  );

  const orderedVisibleIds = React.useMemo(
    () => visibleLayoutItems.map((item) => item.id),
    [visibleLayoutItems],
  );

  const emitLayout = React.useCallback(
    (nextState: LayoutState) => {
      onLayoutStateChange(compactLayoutState(nextState, columns));
    },
    [columns, onLayoutStateChange],
  );

  const clearResizePreview = () => {
    previewWidthByIdRef.current = {};
    setPreviewWidthById({});
    activeResizeRef.current = null;
  };

  const resolveScopeForId = (itemId: string) => reorderScopeById?.[itemId] ?? '__default__';

  const canDropOnItem = (sourceId: string, targetId: string): boolean => {
    if (!reorderScopeById) return true;
    return resolveScopeForId(sourceId) === resolveScopeForId(targetId);
  };

  const handleDragStart = (itemId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
    if (mode !== 'customize') {
      event.preventDefault();
      return;
    }
    setDraggingId(itemId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', itemId);
    }
  };

  const handleDragOver = (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    if (mode !== 'customize' || !draggingId || draggingId === itemId) return;
    const canDrop = canDropOnItem(draggingId, itemId);
    if (!canDrop) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
      setDragOverId(itemId);
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    setDragOverId(itemId);
  };

  const handleDrop = (itemId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    if (mode !== 'customize') return;
    event.preventDefault();
    const sourceId = draggingId || event.dataTransfer?.getData('text/plain');
    if (!sourceId || sourceId === itemId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    if (!canDropOnItem(sourceId, itemId)) {
      onInvalidDropScope?.(sourceId, itemId);
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    emitLayout(moveLayoutItem(layoutState, sourceId, itemId, columns));
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleMove = React.useCallback(
    (itemId: string, direction: 'up' | 'down') => {
      if (mode !== 'customize') return;
      const index = orderedVisibleIds.indexOf(itemId);
      if (index < 0) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= orderedVisibleIds.length) return;
      const targetId = orderedVisibleIds[targetIndex];
      if (!canDropOnItem(itemId, targetId)) {
        onInvalidDropScope?.(itemId, targetId);
        return;
      }
      emitLayout(moveLayoutItem(layoutState, itemId, targetId, columns));
    },
    [columns, emitLayout, layoutState, mode, onInvalidDropScope, orderedVisibleIds],
  );

  const handleResizeStart = (itemId: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isEnterprise || mode !== 'customize') return;
    const currentItem = visibleLayoutItems.find((item) => item.id === itemId);
    if (!currentItem) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const width = canvasRect?.width ?? 0;
    const columnWidth = width > 0 ? width / columns : 1;
    activeResizeRef.current = {
      itemId,
      startX: event.clientX,
      startWidth: currentItem.w,
      columnWidth: Math.max(1, columnWidth),
    };
    previewWidthByIdRef.current = {
      ...previewWidthByIdRef.current,
      [itemId]: currentItem.w,
    };
    setPreviewWidthById((current) => ({ ...current, [itemId]: currentItem.w }));
  };

  const handleResizePreview = (itemId: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    const active = activeResizeRef.current;
    if (!active || active.itemId !== itemId) return;
    const rule = resizeRulesById?.[itemId];
    const deltaCols = (event.clientX - active.startX) / active.columnWidth;
    const rawWidth = active.startWidth + deltaCols;
    const nextWidth = resolveResizeWidth(rawWidth, rule);
    previewWidthByIdRef.current = {
      ...previewWidthByIdRef.current,
      [itemId]: nextWidth,
    };
    setPreviewWidthById((current) => ({ ...current, [itemId]: nextWidth }));
  };

  const handleResizeCommit = (itemId: string) => () => {
    const previewWidth = previewWidthByIdRef.current[itemId];
    clearResizePreview();
    if (!Number.isFinite(previewWidth)) return;
    emitLayout(setLayoutItemWidth(layoutState, itemId, previewWidth, columns));
  };

  const handleKeyboardResize = (itemId: string, direction: 'shrink' | 'expand') => {
    if (!isEnterprise || !enableKeyboardResize || mode !== 'customize') return;
    const currentItem = visibleLayoutItems.find((item) => item.id === itemId);
    if (!currentItem) return;
    const rule = resizeRulesById?.[itemId];
    const step = Math.max(1, Math.round(rule?.step ?? 1));
    const delta = direction === 'expand' ? step : -step;
    const nextWidth = resolveResizeWidth(currentItem.w + delta, rule);
    emitLayout(setLayoutItemWidth(layoutState, itemId, nextWidth, columns));
  };

  const resetDragState = () => {
    setDraggingId(null);
    setDragOverId(null);
    clearResizePreview();
  };

  return (
    <div
      ref={canvasRef}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'grid grid-cols-1 gap-4 xl:grid-cols-12',
        rowHeightClassName,
        className,
      )}
      {...props}
    >
      {visibleLayoutItems.map((layoutItem) => {
        const item = itemById.get(layoutItem.id);
        if (!item) return null;

        const isDragging = draggingId === layoutItem.id;
        const isDragOver = dragOverId === layoutItem.id && draggingId !== layoutItem.id;
        const isInvalidDrop = !!draggingId && isDragOver && !canDropOnItem(draggingId, layoutItem.id);
        const previewWidth = previewWidthById[layoutItem.id];
        const tileLayout = {
          ...layoutItem,
          w: Number.isFinite(previewWidth) ? previewWidth : layoutItem.w,
        };

        return (
          <div
            key={layoutItem.id}
            data-layout-item-id={layoutItem.id}
            onDragOver={handleDragOver(layoutItem.id)}
            onDrop={handleDrop(layoutItem.id)}
            onDragEnd={resetDragState}
            style={cssGridVars(tileLayout)}
            title={isInvalidDrop ? 'Widgets cannot move between structural lanes' : undefined}
            className={cn(
              'min-h-0 xl:[grid-column:var(--editable-col-start)_/_span_var(--editable-col-span)] xl:[grid-row:var(--editable-row-start)_/_span_var(--editable-row-span)]',
              mode !== 'customize' && 'h-full',
              isInvalidDrop && 'cursor-not-allowed',
            )}
          >
            {mode === 'customize' ? (
              <LayoutTile
                id={layoutItem.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                width={tileLayout.w}
                widthSteps={widthSteps}
                onWidthChange={(nextWidth) =>
                  emitLayout(setLayoutItemWidth(layoutState, layoutItem.id, nextWidth, columns))
                }
                onMoveUp={isEnterprise ? undefined : () => handleMove(layoutItem.id, 'up')}
                onMoveDown={isEnterprise ? undefined : () => handleMove(layoutItem.id, 'down')}
                disableMoveUp={orderedVisibleIds.indexOf(layoutItem.id) <= 0}
                disableMoveDown={orderedVisibleIds.indexOf(layoutItem.id) >= orderedVisibleIds.length - 1}
                onHide={onHideItem ? () => onHideItem(layoutItem.id) : undefined}
                onDragStart={handleDragStart(layoutItem.id)}
                onDragEnd={resetDragState}
                onKeyboardReorder={(direction) => handleMove(layoutItem.id, direction)}
                onResizeStart={handleResizeStart(layoutItem.id)}
                onResizePreview={handleResizePreview(layoutItem.id)}
                onResizeCommit={handleResizeCommit(layoutItem.id)}
                onKeyboardResize={(direction) => handleKeyboardResize(layoutItem.id, direction)}
                isDragging={isDragging}
                isDragOver={isDragOver}
                variant={variant}
              />
            ) : (
              <div className="h-full">{item.view}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
