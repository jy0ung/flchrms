import * as React from "react";

import { cn } from "@/lib/utils";

export interface AppPageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "none" | "compact" | "comfortable" | "relaxed";
  maxWidth?: "none" | "6xl" | "7xl" | "full";
  framePadding?: "none" | "shell" | "page";
}

const spacingClasses: Record<NonNullable<AppPageContainerProps["spacing"]>, string> = {
  none: "",
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

const framePaddingClasses: Record<NonNullable<AppPageContainerProps["framePadding"]>, string> = {
  none: "",
  shell: "px-4 md:px-6 lg:px-8",
  page: "px-4 md:px-6 lg:px-8",
};

/**
 * Shared route-level content wrapper.
 * Standardizes page spacing rhythm and optional page-level max-width constraints.
 */
export function AppPageContainer({
  spacing = "comfortable",
  maxWidth = "7xl",
  framePadding = "none",
  className,
  children,
  ...props
}: AppPageContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        spacingClasses[spacing],
        framePaddingClasses[framePadding],
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
