import * as React from "react";

import { PageHeader, type PageHeaderProps } from "@/components/system";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderBlockProps extends Omit<PageHeaderProps, "toolbarSlot"> {
  eyebrow?: React.ReactNode;
  metaSlot?: React.ReactNode;
}

export function WorkspaceHeaderBlock({
  eyebrow,
  metaSlot,
  className,
  ...props
}: WorkspaceHeaderBlockProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </div>
      ) : null}
      <PageHeader layout="aligned" {...props} />
      {metaSlot ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {metaSlot}
        </div>
      ) : null}
    </div>
  );
}
