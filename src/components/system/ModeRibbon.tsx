import * as React from "react";
import { Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INTERACTION_MODE_LABELS,
  type InteractionMode,
} from "@/components/system/interaction-mode";
import { useInteractionMode } from "@/components/system/InteractionModeProvider";

export interface ModeRibbonProps extends React.HTMLAttributes<HTMLDivElement> {
  descriptions?: Partial<Record<InteractionMode, string>>;
  actions?: React.ReactNode;
  showInViewMode?: boolean;
  dismissLabel?: string;
  variant?: 'default' | 'compact';
  sticky?: boolean;
  hideDescription?: boolean;
  labelOverride?: Partial<Record<InteractionMode, string>>;
  stickyOffsetClassName?: string;
}

/**
 * Compact contextual ribbon shown when a non-view interaction mode is active.
 * Keeps mode controls visible without injecting large vertical layouts.
 */
export function ModeRibbon({
  descriptions,
  actions,
  showInViewMode = false,
  dismissLabel = "Return to view",
  variant = 'default',
  sticky = false,
  hideDescription = false,
  labelOverride,
  stickyOffsetClassName = 'top-[68px] md:top-4',
  className,
  ...props
}: ModeRibbonProps) {
  const { mode, resetMode } = useInteractionMode();
  const isViewMode = mode === "view";

  if (!showInViewMode && isViewMode) return null;

  const modeLabel = labelOverride?.[mode] ?? INTERACTION_MODE_LABELS[mode];
  const description = descriptions?.[mode];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/70 bg-card/70 sm:flex-row sm:items-center sm:justify-between",
        variant === 'compact' ? 'px-3 py-2' : 'px-3 py-2.5',
        sticky && 'sticky z-20',
        sticky && stickyOffsetClassName,
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {modeLabel} mode active
        </p>
        {!hideDescription && description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {!isViewMode ? (
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={resetMode}>
            {dismissLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
