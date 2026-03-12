import * as React from "react";

import { AppPageContainer, PageHeader, type PageHeaderAction } from "@/components/system";
import { cn } from "@/lib/utils";

export interface UtilityLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
  actionsSlot?: React.ReactNode;
  summarySlot?: React.ReactNode;
  controlsSlot?: React.ReactNode;
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
  title,
  description,
  actions,
  actionsSlot,
  summarySlot,
  controlsSlot,
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
      <PageHeader
        layout="aligned"
        title={title}
        description={description}
        actions={actions}
        actionsSlot={actionsSlot}
      />

      {summarySlot ? <div className="pt-1">{summarySlot}</div> : null}
      {controlsSlot ? <div className="pt-1">{controlsSlot}</div> : null}

      <div className={cn("space-y-4 md:space-y-5", contentClassName)}>{children}</div>
    </AppPageContainer>
  );
}
