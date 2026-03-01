import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CardHeaderStandard } from "@/components/system/CardHeaderStandard";
import { cn } from "@/lib/utils";

export interface DataTableShellProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
  density?: "default" | "compact";
  toolbar?: React.ReactNode;
  alertBanner?: React.ReactNode;
  loading?: boolean;
  hasData?: boolean;
  loadingSkeleton?: React.ReactNode;
  emptyState?: React.ReactNode;
  table?: React.ReactNode;
  mobileList?: React.ReactNode;
  content?: React.ReactNode;
  pagination?: React.ReactNode;
  stickyToolbar?: boolean;
  contentClassName?: string;
}

/**
 * Standard shell for list/table screens.
 * Provides a consistent container hierarchy: header -> toolbar -> alerts -> content -> pagination.
 */
export function DataTableShell({
  title,
  description,
  headerActions,
  density = "default",
  toolbar,
  alertBanner,
  loading = false,
  hasData,
  loadingSkeleton,
  emptyState,
  table,
  mobileList,
  content,
  pagination,
  stickyToolbar = false,
  className,
  contentClassName,
  ...props
}: DataTableShellProps) {
  const titleId = React.useId();
  const hasHeader = Boolean(title || description || headerActions);
  const hasRows = hasData ?? Boolean(content || table || mobileList);
  const compactDensity = density === "compact";

  return (
    <Card
      role="region"
      aria-labelledby={title ? titleId : undefined}
      aria-busy={loading || undefined}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      {hasHeader ? (
        <CardHeaderStandard
          title={title ?? ""}
          titleId={title ? titleId : undefined}
          description={description}
          actions={headerActions}
          className={compactDensity ? "p-4 pb-3 sm:p-5 sm:pb-3" : "p-4"}
          titleClassName={compactDensity ? "text-base font-semibold" : "text-lg font-semibold"}
          actionsClassName={cn(
            "w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end",
            compactDensity ? "sm:flex-nowrap" : "sm:flex-wrap",
          )}
        />
      ) : null}

      <CardContent
        className={cn(
          compactDensity ? "space-y-3 p-3 sm:p-4" : "space-y-4 p-4 sm:p-5",
          hasHeader && (compactDensity ? "pt-3" : "pt-4"),
          contentClassName,
        )}
      >
        {toolbar ? (
          <div className={cn(stickyToolbar && "sticky top-0 z-10")}>
            {hasHeader ? <Separator className="mb-4" /> : null}
            {toolbar}
          </div>
        ) : hasHeader ? (
          <Separator />
        ) : null}

        {alertBanner ? <div>{alertBanner}</div> : null}

        {loading ? (
          loadingSkeleton ?? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Loading…
            </div>
          )
        ) : hasRows ? (
          content ?? (
            <div className="space-y-4">
              {mobileList ? <div className="md:hidden">{mobileList}</div> : null}
              {table ? <div className={cn(mobileList && "hidden md:block")}>{table}</div> : null}
              {!mobileList && !table ? null : null}
            </div>
          )
        ) : (
          emptyState ?? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No records found.
            </div>
          )
        )}

        {pagination ? (
          <>
            <Separator />
            <div>{pagination}</div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
