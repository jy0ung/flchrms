import * as React from "react";
import { AlertCircle, CheckCircle2, Clock3, Info, Shield, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusMeta, type StatusIconKey } from "@/lib/status-system";

const iconMap: Partial<Record<StatusIconKey, React.ComponentType<{ className?: string }>>> = {
  clock: Clock3,
  info: Info,
  check: CheckCircle2,
  alert: AlertCircle,
  x: XCircle,
  shield: Shield,
};

const toneClassNames = {
  neutral: "border-border bg-card text-foreground",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
  danger: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200",
} as const;

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
  labelOverride?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

/**
 * Semantic status badge wrapper.
 * Replaces page-local status color maps with a shared registry + tone mapping.
 */
export function StatusBadge({
  status,
  labelOverride,
  size = "sm",
  showIcon = false,
  className,
  ...props
}: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const Icon = showIcon && meta.iconKey ? iconMap[meta.iconKey] : undefined;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium tracking-normal",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        toneClassNames[meta.tone],
        className,
      )}
      aria-label={meta.ariaLabel ?? `${labelOverride ?? meta.label} status`}
      {...props}
    >
      {Icon ? <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden="true" /> : null}
      <span>{labelOverride ?? meta.label}</span>
    </Badge>
  );
}

