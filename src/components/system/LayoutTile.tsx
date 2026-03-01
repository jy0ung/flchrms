import * as React from 'react';
import { CornerDownRight, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardHeaderStandard } from '@/components/system/CardHeaderStandard';
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

/**
 * Standard edit-mode tile shell using the same header discipline as view cards.
 */
export function LayoutTile({
  title,
  description,
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
}: LayoutTileProps) {
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

  return (
    <Card
      className={cn(
        'relative h-full border-border shadow-sm transition-colors',
        isDragging && 'opacity-70',
        isDragOver && 'border-primary/40 bg-primary/5',
      )}
    >
      <CardHeaderStandard
        mode="edit"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragKeyDown={handleDragKeyDown}
        dragAriaLabel={`Reorder ${title} widget`}
        dragTitle={`Drag ${title} widget to reorder`}
        title={title}
        description={description}
        titleClassName="text-sm font-semibold leading-tight"
        descriptionClassName="line-clamp-2 text-xs leading-relaxed text-muted-foreground"
        actions={
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
        }
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute bottom-3 right-3 h-8 w-8 cursor-se-resize rounded-lg text-muted-foreground"
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
    </Card>
  );
}

