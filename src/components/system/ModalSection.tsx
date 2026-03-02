import * as React from "react";

import { cn } from "@/lib/utils";

export interface ModalSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  tone?: "default" | "muted" | "success" | "warning" | "danger";
  compact?: boolean;
}

const toneClasses = {
  default: "border-border bg-card",
  muted: "border-border bg-muted/50",
  success: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
  warning: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
  danger: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
} as const;

/**
 * Lightweight standardized content section for modal bodies.
 * Keeps internal hierarchy consistent without imposing feature-specific layout.
 */
export function ModalSection({
  title,
  description,
  tone = "default",
  compact = false,
  className,
  children,
  ...props
}: ModalSectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg border",
        toneClasses[tone],
        compact ? "p-3" : "p-4",
        className,
      )}
      {...props}
    >
      {title || description ? (
        <div className={cn("mb-3", compact ? "space-y-0.5" : "space-y-1")}>
          {title ? <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3> : null}
          {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

