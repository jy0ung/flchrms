import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  EyeOff,
  GripVertical,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface LayoutTileProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  width: number;
  widthSteps: readonly number[];
  onWidthChange: (width: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  onHide?: () => void;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>;
  onKeyboardReorder?: (direction: 'up' | 'down') => void;
  onResizeStart?: React.PointerEventHandler<HTMLButtonElement>;
  onResizePreview?: React.PointerEventHandler<HTMLButtonElement>;
  onResizeCommit?: React.PointerEventHandler<HTMLButtonElement>;
  onKeyboardResize?: (direction: 'shrink' | 'expand') => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  variant?: 'legacy' | 'enterprise';
}

function widthLabel(width: number, widthSteps: readonly number[]): string {
  const step = [...widthSteps].sort((a, b) => a - b);
  if (width <= (step[0] ?? width)) return 'S';
  if (width >= (step[step.length - 1] ?? width)) return 'L';
  return 'M';
}

/**
 * Fixed-height tile used in customize mode.
 * Enterprise variant keeps controls minimal and does not expose grid metadata.
 */
export function LayoutTile({
  id,
  title,
  description,
  icon: Icon,
  width,
  widthSteps,
  onWidthChange,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  onHide,
  onDragStart,
  onDragEnd,
  onKeyboardReorder,
  onResizeStart,
  onResizePreview,
  onResizeCommit,
  onKeyboardResize,
  isDragging,
  isDragOver,
  variant = 'legacy',
}: LayoutTileProps) {
  const isEnterprise = variant === 'enterprise';
  const resizingPointerIdRef = React.useRef<number | null>(null);

  const handleDragKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!onKeyboardReorder) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onKeyboardReorder('up');
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onKeyboardReorder('down');
    }
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!onKeyboardResize) return;
    if (!event.shiftKey) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onKeyboardResize('shrink');
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onKeyboardResize('expand');
    }
  };

  const onResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const pointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
    resizingPointerIdRef.current = pointerId;
    if (pointerId !== null) {
      event.currentTarget.setPointerCapture(pointerId);
    }
    onResizeStart?.(event);
  };

  const onResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const pointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
    if (
      resizingPointerIdRef.current !== null &&
      pointerId !== null &&
      resizingPointerIdRef.current !== pointerId
    ) {
      return;
    }
    onResizePreview?.(event);
  };

  const onResizePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const pointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
    if (
      resizingPointerIdRef.current !== null &&
      pointerId !== null &&
      resizingPointerIdRef.current !== pointerId
    ) {
      return;
    }
    resizingPointerIdRef.current = null;
    if (pointerId !== null && event.currentTarget.hasPointerCapture(pointerId)) {
      event.currentTarget.releasePointerCapture(pointerId);
    }
    onResizeCommit?.(event);
  };

  if (isEnterprise) {
    return (
      <Card
        className={cn(
          'h-full border-border/60 shadow-sm transition-colors',
          isDragging && 'opacity-70',
          isDragOver && 'border-primary/40 bg-primary/5',
        )}
      >
        <CardContent className="relative flex h-full flex-col p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onKeyDown={handleDragKeyDown}
                className="h-8 w-8 cursor-grab rounded-lg text-muted-foreground active:cursor-grabbing"
                aria-label={`Reorder ${title} widget`}
                title={`Drag ${title} widget to reorder`}
              >
                <GripVertical className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                {description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {Icon ? (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/20 text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onHide}
                disabled={!onHide}
                aria-label={`Hide ${title} widget`}
                title={`Hide ${title} widget`}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 rounded-lg cursor-se-resize text-muted-foreground"
            aria-label={`Resize ${title} widget`}
            title={`Resize ${title} widget`}
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
            onKeyDown={handleResizeKeyDown}
          >
            <CornerDownRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'h-full border-border/60 shadow-sm transition-colors',
        isDragging && 'opacity-70',
        isDragOver && 'border-primary/40 bg-primary/5',
      )}
    >
      <CardContent className="flex h-full flex-col justify-between p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              className="h-8 w-8 cursor-grab rounded-lg text-muted-foreground active:cursor-grabbing"
              aria-label={`Drag ${title}`}
              title={`Drag ${title} to reorder`}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{title}</p>
              <p className="text-[11px] text-muted-foreground">Size {widthLabel(width, widthSteps)} • {width}/12</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
              {widthSteps.map((step) => (
                <Button
                  key={`${id}-${step}`}
                  type="button"
                  variant={width === step ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 rounded-md px-2 text-[11px]"
                  onClick={() => onWidthChange(step)}
                  aria-label={`Set ${title} width to ${step}/12`}
                >
                  {widthLabel(step, widthSteps)}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={onMoveUp}
              disabled={disableMoveUp || !onMoveUp}
              aria-label={`Move ${title} up`}
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={onMoveDown}
              disabled={disableMoveDown || !onMoveDown}
              aria-label={`Move ${title} down`}
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs"
              onClick={onHide}
              disabled={!onHide}
            >
              Hide
            </Button>
          </div>
        </div>

        <div className="mt-2 flex min-h-0 items-end justify-between gap-2">
          <div className="min-w-0">
            {description ? <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {Icon ? (
            <span className="shrink-0 rounded-lg border border-border/60 bg-muted/20 p-2 text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
