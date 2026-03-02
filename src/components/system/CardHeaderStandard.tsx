import * as React from "react";
import { GripVertical } from "lucide-react";

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CardHeaderMode = "view" | "edit";

export interface CardHeaderStandardProps {
  mode?: CardHeaderMode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLButtonElement>;
  onDragEnd?: React.DragEventHandler<HTMLButtonElement>;
  onDragKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  dragAriaLabel?: string;
  dragTitle?: string;
  titleId?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  actionsClassName?: string;
}

/**
 * Standardized card header composition:
 * [optional drag] [title + description] [optional controls]
 */
export function CardHeaderStandard({
  mode = "view",
  title,
  description,
  actions,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragKeyDown,
  dragAriaLabel = "Drag card",
  dragTitle = "Drag card",
  titleId,
  className,
  titleClassName,
  descriptionClassName,
  actionsClassName,
}: CardHeaderStandardProps) {
  const showDrag = mode === "edit" && draggable;

  return (
    <CardHeader className={cn("p-4", className)}>
      <div className="flex items-start gap-3">
        {showDrag ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onKeyDown={onDragKeyDown}
            aria-label={dragAriaLabel}
            title={dragTitle}
            className="h-8 w-8 shrink-0 cursor-grab rounded-lg text-muted-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        ) : null}

        <div className="min-w-0 flex-1 space-y-2">
          <CardTitle id={titleId} className={cn("text-base font-semibold", titleClassName)}>
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className={cn("text-sm", descriptionClassName)}>
              {description}
            </CardDescription>
          ) : null}
        </div>

        {actions ? (
          <div className={cn("ml-auto flex shrink-0 items-center gap-2", actionsClassName)}>
            {actions}
          </div>
        ) : null}
      </div>
    </CardHeader>
  );
}

