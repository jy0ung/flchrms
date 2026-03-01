import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ──────────────────── Table Row Skeleton ──────────────────── */

export interface TableRowSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns per row */
  columns?: number;
  className?: string;
}

/**
 * Skeleton placeholder for table-based data loading states.
 * Drop into DataTableShell's `loadingSkeleton` prop.
 */
export function TableRowSkeleton({ rows = 5, columns = 4, className }: TableRowSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-3 rounded-md border border-border p-3">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className={cn(
                "h-4 rounded",
                c === 0 ? "w-1/4" : c === columns - 1 ? "w-16" : "flex-1",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────── Card Grid Skeleton ──────────────────── */

export interface CardSkeletonProps {
  /** Number of skeleton cards to render */
  count?: number;
  className?: string;
}

/**
 * Skeleton placeholder for card grid loading states.
 */
export function CardSkeleton({ count = 6, className }: CardSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────── Stat Card Skeleton ──────────────────── */

export interface StatSkeletonProps {
  /** Number of skeleton stat items */
  count?: number;
  className?: string;
}

/**
 * Skeleton placeholder for stat/metric card grids.
 */
export function StatSkeleton({ count = 4, className }: StatSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-2">
          <Skeleton className="h-3 w-1/2 rounded" />
          <Skeleton className="h-6 w-2/3 rounded" />
          <Skeleton className="h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}
