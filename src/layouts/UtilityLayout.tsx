import * as React from "react";

import { AppPageContainer, type PageHeaderAction } from "@/components/system";
import { cn } from "@/lib/utils";
import { WorkspaceHeaderBlock } from "@/layouts/WorkspaceHeaderBlock";

export interface UtilityLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
  actionsSlot?: React.ReactNode;
  metaSlot?: React.ReactNode;
  summarySlot?: React.ReactNode;
  controlsSlot?: React.ReactNode;
  controlsSurface?: "flat" | "none";
  maxWidth?: "none" | "6xl" | "7xl" | "full";
  spacing?: "compact" | "comfortable" | "relaxed";
  contentClassName?: string;
}

/**
 * Shared shell for non-module utility routes.
 * Keeps a lighter structure than ModuleLayout while standardizing:
 * header -> optional summary -> optional controls -> primary surface.
 */
export function UtilityLayout({
  eyebrow,
  title,
  description,
  actions,
  actionsSlot,
  metaSlot,
  summarySlot,
  controlsSlot,
  controlsSurface = "flat",
  maxWidth = "7xl",
  spacing = "comfortable",
  className,
  contentClassName,
  children,
  ...props
}: UtilityLayoutProps) {
  return (
    <AppPageContainer
      maxWidth={maxWidth}
      spacing={spacing}
      framePadding="none"
      className={cn("w-full", className)}
      {...props}
    >
      <WorkspaceHeaderBlock
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
        actionsSlot={actionsSlot}
        metaSlot={metaSlot}
      />

      {summarySlot ? <div className="pt-1">{summarySlot}</div> : null}
      {controlsSlot ? (
        controlsSurface === "none" ? (
          <div className="pt-1">{controlsSlot}</div>
        ) : (
          <section className="rounded-2xl border border-border/60 bg-background/50 p-3 sm:p-4">
            {controlsSlot}
          </section>
        )
      ) : null}

      <div className={cn("space-y-4 md:space-y-5", contentClassName)}>{children}</div>
    </AppPageContainer>
  );
}
