import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              {title ? <CardTitle id={titleId}>{title}</CardTitle> : null}
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
            {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("p-4 sm:p-5", hasHeader && "pt-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
