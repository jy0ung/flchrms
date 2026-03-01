import * as React from "react";
import {
  Layers3,
  LayoutDashboard,
  PencilLine,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  INTERACTION_MODE_LABELS,
  type InteractionMode,
  normalizeInteractionModes,
} from "@/components/system/interaction-mode";
import { useInteractionMode } from "@/components/system/InteractionModeProvider";

export interface InteractionModeToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  modes?: readonly InteractionMode[];
  includeView?: boolean;
  layout?: "grid" | "inline";
  ariaLabel?: string;
  labels?: Partial<Record<InteractionMode, string>>;
  singleModeLabels?: {
    activate: string;
    deactivate: string;
  };
}

const defaultModeIcons: Record<InteractionMode, React.ComponentType<{ className?: string }>> = {
  view: LayoutDashboard,
  edit: PencilLine,
  bulk: Layers3,
  manage: Wrench,
  customize: SlidersHorizontal,
};

function buildAvailableModes(
  configuredModes: readonly InteractionMode[] | undefined,
  allowedModes: readonly InteractionMode[],
  includeView: boolean,
): InteractionMode[] {
  const base = configuredModes && configuredModes.length > 0 ? normalizeInteractionModes(configuredModes) : normalizeInteractionModes(allowedModes);
  const filtered = base.filter((mode) => allowedModes.includes(mode) && (includeView || mode !== "view"));
  if (includeView && !filtered.includes("view")) {
    filtered.unshift("view");
  }
  return filtered;
}

/**
 * Shared toggle for route-scoped interaction modes.
 * Supports segmented mode switching and a compact single-button mode for one-way toggles.
 */
export function InteractionModeToggle({
  modes,
  includeView = true,
  layout = "grid",
  ariaLabel,
  labels,
  singleModeLabels,
  className,
  ...props
}: InteractionModeToggleProps) {
  const { mode, setMode, resetMode, allowedModes } = useInteractionMode();
  const availableModes = React.useMemo(
    () => buildAvailableModes(modes, allowedModes, includeView),
    [allowedModes, includeView, modes],
  );

  if (availableModes.length === 0) return null;

  if (!includeView && availableModes.length === 1) {
    const targetMode = availableModes[0];
    const isActive = mode === targetMode;
    const targetLabel = labels?.[targetMode] ?? INTERACTION_MODE_LABELS[targetMode];
    return (
      <Button
        type="button"
        variant={isActive ? "outline" : "default"}
        className={cn("min-w-[170px] rounded-lg", className)}
        aria-label={ariaLabel}
        onClick={() => (isActive ? resetMode() : setMode(targetMode))}
        {...props}
      >
        <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
        {isActive
          ? (singleModeLabels?.deactivate ?? `Done ${targetLabel}`)
          : (singleModeLabels?.activate ?? targetLabel)}
      </Button>
    );
  }

  const selectedValue = availableModes.includes(mode) ? mode : "";

  return (
    <div className={cn("w-full sm:w-auto", className)} {...props}>
      <ToggleGroup
        type="single"
        value={selectedValue}
        onValueChange={(nextValue) => {
          if (!nextValue) return;
          if (nextValue === mode) return;
          setMode(nextValue as InteractionMode);
        }}
        className={cn(
          "rounded-lg border border-border bg-muted/50 p-1",
          layout === "inline"
            ? "flex w-full flex-nowrap items-center gap-1 overflow-x-auto sm:w-auto"
            : "grid w-full grid-cols-2 gap-1 sm:inline-grid sm:w-auto",
        )}
        aria-label={ariaLabel ?? 'Interaction mode'}
      >
        {availableModes.map((nextMode) => {
          const Icon = defaultModeIcons[nextMode];
          const label = labels?.[nextMode] ?? INTERACTION_MODE_LABELS[nextMode];
          return (
            <ToggleGroupItem
              key={nextMode}
              value={nextMode}
              aria-label={`Set mode to ${label}`}
              className={cn(
                "h-9 rounded-lg border-0 px-3 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm sm:text-sm",
                layout === "inline" && "min-w-max flex-none",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
