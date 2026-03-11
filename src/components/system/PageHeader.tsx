import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
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

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
  actionsSlot?: React.ReactNode;
  tabsSlot?: React.ReactNode;
  toolbarSlot?: React.ReactNode;
  headingLevel?: 1 | 2 | 3;
  titleId?: string;
  layout?: "aligned" | "stacked";
}

function renderAction(action: PageHeaderAction) {
  const Icon = action.icon;

  if (action.href) {
    return (
      <Button
        key={action.id}
        asChild
        variant={action.variant ?? "outline"}
        size={action.size ?? "sm"}
        disabled={action.disabled}
        aria-label={action.ariaLabel}
      >
        <a href={action.href} target={action.target} rel={action.rel}>
          {Icon ? <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" /> : null}
          {action.label}
        </a>
      </Button>
    );
  }

  return (
    <Button
      key={action.id}
      type="button"
      variant={action.variant ?? "outline"}
      size={action.size ?? "sm"}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.ariaLabel}
    >
      {Icon ? <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" /> : null}
      {action.label}
    </Button>
  );
}

/**
 * Simple page heading with optional description, actions, tabs and toolbar.
 */
export function PageHeader({
  title,
  description,
  actions,
  actionsSlot,
  tabsSlot,
  toolbarSlot,
  headingLevel = 1,
  titleId,
  layout = "aligned",
  className,
  ...props
}: PageHeaderProps) {
  const autoTitleId = React.useId();
  const HeadingTag: React.ElementType = `h${headingLevel}`;
  const headerTitleId = titleId ?? autoTitleId;

  return (
    <header
      className={cn("space-y-4", className)}
      role="region"
      aria-labelledby={headerTitleId}
      {...props}
    >
      <div
        className={cn(
          "gap-3",
          layout === "aligned"
            ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-6"
            : "flex flex-col",
        )}
      >
        <div className="min-w-0 space-y-1">
          <HeadingTag
            id={headerTitleId}
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {title}
          </HeadingTag>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {(actionsSlot || (actions && actions.length > 0)) ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              layout === "aligned" && "lg:justify-end",
            )}
          >
            {actionsSlot}
            {actions?.map((action) => renderAction(action))}
          </div>
        ) : null}
      </div>

      {tabsSlot ? <div>{tabsSlot}</div> : null}
      {toolbarSlot ? <div>{toolbarSlot}</div> : null}
    </header>
  );
}
