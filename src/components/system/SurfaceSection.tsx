import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderStandard } from "@/components/system/CardHeaderStandard";
import { cn } from "@/lib/utils";

export interface SurfaceSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  contentClassName?: string;
}

/**
 * Thin, reusable section wrapper for non-table content areas.
 * Keeps title/description/action hierarchy consistent across modules.
 */
export function SurfaceSection({
  title,
  description,
  actions,
  contentClassName,
  className,
  children,
  ...props
}: SurfaceSectionProps) {
  const titleId = React.useId();
  const hasHeader = Boolean(title || description || actions);

  return (
    <Card
      role="region"
      aria-labelledby={title ? titleId : undefined}
      className={cn("card-stat border-border/60 shadow-sm", className)}
      {...props}
    >
      {hasHeader ? (
        <CardHeaderStandard
          title={title ?? ""}
          titleId={title ? titleId : undefined}
          description={description}
          actions={actions}
          className="p-6 pb-4"
          actionsClassName="w-full flex-col gap-2 sm:w-auto sm:flex-row"
        />
      ) : null}
      <CardContent className={cn("p-4 sm:p-5", hasHeader && "pt-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
