import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  INTERACTION_MODE_LABELS,
  type InteractionMode,
} from "@/components/system/interaction-mode";
import { useInteractionMode } from "@/components/system/InteractionModeProvider";

export interface InteractionModeSidePanelProps {
  modes: readonly InteractionMode[];
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  side?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
}

/**
 * Optional mode-specific drawer for dense controls that should not reflow page layout.
 * Opens only when one of the configured interaction modes is active.
 */
export function InteractionModeSidePanel({
  modes,
  title,
  description,
  className,
  contentClassName,
  side = "right",
  children,
}: InteractionModeSidePanelProps) {
  const { mode, resetMode } = useInteractionMode();
  const open = modes.includes(mode);
  const modeLabel = INTERACTION_MODE_LABELS[mode];

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetMode();
      }}
    >
      <SheetContent
        side={side}
        className={cn("w-full max-w-[420px] overflow-y-auto", className)}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>
              {description} ({modeLabel} mode)
            </SheetDescription>
          ) : (
            <SheetDescription>{modeLabel} mode</SheetDescription>
          )}
        </SheetHeader>
        <div className={cn("mt-4 space-y-4", contentClassName)}>{children}</div>
      </SheetContent>
    </Sheet>
  );
}

