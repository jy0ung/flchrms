import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface PageHeaderAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
  variant?: ButtonProps["variant"];
  size?: Exclude<ButtonProps["size"], "icon">;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface PageHeaderChip {
  id: string;
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  chips?: PageHeaderChip[];
  chipsSlot?: React.ReactNode;
  actions?: PageHeaderAction[];
  actionsSlot?: React.ReactNode;
  tabsSlot?: React.ReactNode;
  toolbarSlot?: React.ReactNode;
  compact?: boolean;
  sticky?: boolean;
  headingLevel?: 1 | 2 | 3;
  titleId?: string;
}

const chipToneClasses: Record<NonNullable<PageHeaderChip["tone"]>, string> = {
  neutral: "border-border/70 bg-card/70 text-foreground",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
  danger: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200",
};

function renderAction(action: PageHeaderAction) {
  const Icon = action.icon;
  if (action.href) {
    return (
      <Button
        key={action.id}
        asChild
        variant={action.variant ?? "outline"}
        size={action.size ?? "default"}
        disabled={action.disabled}
        aria-label={action.ariaLabel}
        className="min-w-[9rem] justify-center"
      >
        <a href={action.href} target={action.target} rel={action.rel}>
          {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
          <span>{action.label}</span>
        </a>
      </Button>
    );
  }

  return (
    <Button
      key={action.id}
      type="button"
      variant={action.variant ?? "outline"}
      size={action.size ?? "default"}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.ariaLabel}
      className="min-w-[9rem] justify-center"
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      <span>{action.label}</span>
    </Button>
  );
}

/**
 * Reusable page shell header with optional chips, actions, tabs and integrated toolbar region.
 * Visual style intentionally composes the existing Card primitive (no redesign).
 */
export function PageHeader({
  title,
  description,
  chips,
  chipsSlot,
  actions,
  actionsSlot,
  tabsSlot,
  toolbarSlot,
  compact = true,
  sticky = false,
  headingLevel = 1,
  titleId,
  className,
  ...props
}: PageHeaderProps) {
  const autoTitleId = React.useId();
  const hasMeta = Boolean((chips && chips.length) || chipsSlot || tabsSlot || toolbarSlot);
  const HeadingTag: React.ElementType = `h${headingLevel}`;
  const headerTitleId = titleId ?? autoTitleId;

  return (
    <Card
      className={cn(sticky && "sticky top-4 z-20", className)}
      role="region"
      aria-labelledby={headerTitleId}
      {...props}
    >
      <CardHeader className={cn(compact ? "p-4 sm:p-5" : "p-5 sm:p-6", "space-y-0")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <HeadingTag
              id={headerTitleId}
              className={cn(
                "tracking-tight text-foreground",
                compact ? "text-2xl font-semibold leading-tight sm:text-3xl" : "text-3xl font-semibold sm:text-4xl",
              )}
            >
              {title}
            </HeadingTag>
            {description ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
            {chips?.length || chipsSlot ? (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {chips?.map((chip) => (
                  <Badge
                    key={chip.id}
                    variant="outline"
                    className={cn("text-[11px] font-medium tracking-normal", chipToneClasses[chip.tone ?? "neutral"])}
                  >
                    {chip.label}
                  </Badge>
                ))}
                {chipsSlot}
              </div>
            ) : null}
          </div>

          {(actionsSlot || (actions && actions.length > 0)) ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              {actionsSlot}
              {actions?.map(renderAction)}
            </div>
          ) : null}
        </div>
      </CardHeader>

      {hasMeta ? (
        <CardContent className={cn(compact ? "space-y-3 p-4 pt-0 sm:p-5 sm:pt-0" : "space-y-4 p-5 pt-0 sm:p-6 sm:pt-0")}>
          <Separator />
          {tabsSlot ? <div>{tabsSlot}</div> : null}
          {toolbarSlot ? (
            <>
              {tabsSlot ? <Separator /> : null}
              <div>{toolbarSlot}</div>
            </>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
