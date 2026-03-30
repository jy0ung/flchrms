import * as React from "react";

import { AppPageContainer, type PageHeaderAction } from "@/components/system";
import { cn } from "@/lib/utils";
import { WorkspaceHeaderBlock } from "@/layouts/WorkspaceHeaderBlock";

export type UtilityLayoutArchetype = "default" | "task-dashboard" | "inbox";
type UtilityLayoutSurface = "flat" | "none";

export interface UtilityLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  archetype?: UtilityLayoutArchetype;
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
  actionsSlot?: React.ReactNode;
  metaSlot?: React.ReactNode;
  leadSlot?: React.ReactNode;
  leadSurface?: UtilityLayoutSurface;
  summarySlot?: React.ReactNode;
  summarySurface?: UtilityLayoutSurface;
  controlsSlot?: React.ReactNode;
  controlsSurface?: UtilityLayoutSurface;
  supportingSlot?: React.ReactNode;
  supportingSurface?: UtilityLayoutSurface;
  maxWidth?: "none" | "6xl" | "7xl" | "full";
  spacing?: "compact" | "comfortable" | "relaxed";
  contentClassName?: string;
}

function LayoutSurface({
  surface,
  className,
  children,
}: {
  surface: UtilityLayoutSurface;
  className?: string;
  children: React.ReactNode;
}) {
  if (surface === "none") {
    return <div className={className}>{children}</div>;
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-background/50 p-3 sm:p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * Shared shell for non-module utility routes.
 * Keeps a lighter structure than ModuleLayout while standardizing:
 * header -> optional summary -> optional controls -> primary surface.
 */
export function UtilityLayout({
  archetype = "default",
  eyebrow,
  title,
  description,
  actions,
  actionsSlot,
  metaSlot,
  leadSlot,
  leadSurface = "none",
  summarySlot,
  summarySurface = "none",
  controlsSlot,
  controlsSurface,
  supportingSlot,
  supportingSurface = "none",
  maxWidth = "7xl",
  spacing = "comfortable",
  className,
  contentClassName,
  children,
  ...props
}: UtilityLayoutProps) {
  const resolvedControlsSurface =
    controlsSurface ?? (archetype === "inbox" ? "none" : "flat");

  return (
    <AppPageContainer
      maxWidth={maxWidth}
      spacing={spacing}
      framePadding="none"
      className={cn("w-full", className)}
      data-layout-archetype={archetype}
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

      {leadSlot ? <div className="pt-1"><LayoutSurface surface={leadSurface}>{leadSlot}</LayoutSurface></div> : null}
      {summarySlot ? <div className="pt-1"><LayoutSurface surface={summarySurface}>{summarySlot}</LayoutSurface></div> : null}
      {controlsSlot ? <div className="pt-1"><LayoutSurface surface={resolvedControlsSurface}>{controlsSlot}</LayoutSurface></div> : null}

      <div
        className={cn(
          "space-y-4 md:space-y-5",
          archetype === "task-dashboard" && "space-y-5 md:space-y-6",
          contentClassName,
        )}
      >
        {children}
      </div>

      {supportingSlot ? <div className="pt-1"><LayoutSurface surface={supportingSurface}>{supportingSlot}</LayoutSurface></div> : null}
    </AppPageContainer>
  );
}
