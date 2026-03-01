import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SectionToolbarSearchConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  inputProps?: Omit<React.ComponentPropsWithoutRef<typeof Input>, "value" | "onChange" | "placeholder" | "aria-label">;
}

export interface SectionToolbarFilter {
  id: string;
  label?: string;
  control: React.ReactNode;
  minWidthClassName?: string;
}

export interface SectionToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  search?: SectionToolbarSearchConfig;
  filters?: SectionToolbarFilter[];
  actions?: React.ReactNode;
  leadingSlot?: React.ReactNode;
  trailingSlot?: React.ReactNode;
  variant?: "surface" | "inline";
  density?: "comfortable" | "compact";
  stackOnMobile?: boolean;
  sticky?: boolean;
  ariaLabel?: string;
}

/**
 * Shared toolbar shell for search / filters / actions.
 * Keeps layout structure consistent while allowing arbitrary filter controls and actions via slots.
 */
export function SectionToolbar({
  search,
  filters,
  actions,
  leadingSlot,
  trailingSlot,
  variant = "surface",
  density = "comfortable",
  stackOnMobile = true,
  sticky = false,
  ariaLabel = "Section toolbar",
  className,
  ...props
}: SectionToolbarProps) {
  const verticalGap = density === "compact" ? "gap-2" : "gap-3";
  const horizontalGap = density === "compact" ? "sm:gap-2" : "sm:gap-3";

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "w-full",
        variant === "surface" && "rounded-lg border border-border bg-card p-3",
        variant === "inline" && "p-0",
        sticky &&
          (variant === "surface"
            ? "sticky top-0 z-10 bg-card"
            : "sticky top-0 z-10"),
        verticalGap,
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex w-full items-start",
          stackOnMobile ? "flex-col" : "flex-row flex-wrap",
          verticalGap,
          horizontalGap,
          stackOnMobile && "sm:flex-row sm:flex-wrap sm:items-center",
        )}
      >
        {leadingSlot ? <div className="w-full sm:w-auto">{leadingSlot}</div> : null}

        {search ? (
          <div className="relative w-full sm:min-w-[240px] sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder ?? "Search..."}
              aria-label={search.ariaLabel ?? "Search"}
              className="pl-9"
              {...search.inputProps}
            />
          </div>
        ) : null}

        {filters?.length ? (
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
            {filters.map((filter) => (
              <div
                key={filter.id}
                className={cn("grid gap-1", filter.minWidthClassName ?? "sm:min-w-[180px]")}
              >
                {filter.label ? (
                  <div className="text-xs font-medium text-muted-foreground">{filter.label}</div>
                ) : null}
                <div id={`${filter.id}-control`}>{filter.control}</div>
              </div>
            ))}
          </div>
        ) : null}

        {(actions || trailingSlot) ? (
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {trailingSlot}
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
