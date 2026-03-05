import * as React from "react";

import { cn } from "@/lib/utils";

export interface AppPageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "compact" | "comfortable" | "relaxed";
  maxWidth?: "none" | "6xl" | "7xl" | "full";
}

const spacingClasses: Record<NonNullable<AppPageContainerProps["spacing"]>, string> = {
  compact: "space-y-4 md:space-y-5",
  comfortable: "space-y-5 md:space-y-6",
  relaxed: "space-y-6 md:space-y-7",
};

const maxWidthClasses: Record<NonNullable<AppPageContainerProps["maxWidth"]>, string> = {
  none: "",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

/**
 * Shared route-level content wrapper.
 * Standardizes page spacing rhythm and optional page-level max-width constraints.
 */
export function AppPageContainer({
  spacing = "comfortable",
  maxWidth = "7xl",
  className,
  children,
  ...props
}: AppPageContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        spacingClasses[spacing],
        maxWidth !== "none" && maxWidthClasses[maxWidth],
        maxWidth !== "none" && "mx-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
