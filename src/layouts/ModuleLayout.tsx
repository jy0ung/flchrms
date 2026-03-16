import * as React from "react";

import { AppPageContainer, type AppPageContainerProps, type PageHeaderProps, SectionToolbar, type SectionToolbarProps } from "@/components/system";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { WorkspaceHeaderBlock } from "@/layouts/WorkspaceHeaderBlock";

export interface ModuleLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: AppPageContainerProps["spacing"];
  maxWidth?: AppPageContainerProps["maxWidth"];
}

export interface ModuleHeaderProps extends Omit<PageHeaderProps, "toolbarSlot"> {
  eyebrow?: React.ReactNode;
  metaSlot?: React.ReactNode;
}

export interface ModuleToolbarProps extends Omit<SectionToolbarProps, "variant"> {
  children?: React.ReactNode;
  surfaceClassName?: string;
  contentClassName?: string;
  surfaceVariant?: "card" | "flat";
}

export interface ContentAreaProps extends React.HTMLAttributes<HTMLElement> {
  aside?: React.ReactNode;
  asidePosition?: "start" | "end";
  asideSticky?: boolean;
  contentClassName?: string;
  asideClassName?: string;
}

export interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  contentClassName?: string;
  bodyClassName?: string;
  restoreFocusElement?: HTMLElement | null;
}

function ModuleLayoutRoot({
  spacing = "comfortable",
  maxWidth = "7xl",
  className,
  children,
  ...props
}: ModuleLayoutProps) {
  return (
    <AppPageContainer
      spacing={spacing}
      maxWidth={maxWidth}
      framePadding="none"
      className={cn("w-full", className)}
      {...props}
    >
      {children}
    </AppPageContainer>
  );
}

function ModuleHeader({
  eyebrow,
  metaSlot,
  className,
  ...props
}: ModuleHeaderProps) {
  return (
    <WorkspaceHeaderBlock
      eyebrow={eyebrow}
      metaSlot={metaSlot}
      className={className}
      {...props}
    />
  );
}

function ModuleToolbar({
  children,
  search,
  filters,
  actions,
  leadingSlot,
  trailingSlot,
  density = "comfortable",
  stackOnMobile = true,
  sticky = false,
  ariaLabel = "Module controls",
  className,
  surfaceClassName,
  contentClassName,
  surfaceVariant = "card",
  ...props
}: ModuleToolbarProps) {
  const hasToolbarControls = Boolean(
    search ||
      (filters && filters.length > 0) ||
      actions ||
      leadingSlot ||
      trailingSlot,
  );

  const body = (
    <>
      {hasToolbarControls ? (
        <SectionToolbar
          search={search}
          filters={filters}
          actions={actions}
          leadingSlot={leadingSlot}
          trailingSlot={trailingSlot}
          density={density}
          stackOnMobile={stackOnMobile}
          sticky={sticky}
          ariaLabel={ariaLabel}
          variant="inline"
          className={className}
          {...props}
        />
      ) : null}
      {children ? (
        <div className={cn(hasToolbarControls && "mt-3")}>
          {children}
        </div>
      ) : null}
    </>
  );

  if (surfaceVariant === "flat") {
    return (
      <section
        role={hasToolbarControls ? "region" : undefined}
        aria-label={hasToolbarControls ? ariaLabel : undefined}
        className={cn(
          "rounded-2xl border border-border/60 bg-background/50 p-3 sm:p-4",
          surfaceClassName,
          contentClassName,
        )}
      >
        {body}
      </section>
    );
  }

  return (
    <Card className={cn("border-border/80 shadow-sm", surfaceClassName)}>
      <CardContent className={cn("p-3 sm:p-4", contentClassName)}>
        {body}
      </CardContent>
    </Card>
  );
}

function ContentArea({
  aside,
  asidePosition = "end",
  asideSticky = false,
  className,
  contentClassName,
  asideClassName,
  children,
  ...props
}: ContentAreaProps) {
  const hasAside = Boolean(aside);

  return (
    <section
      className={cn("w-full", className)}
      {...props}
    >
      <div
        className={cn(
          "grid gap-4 lg:gap-6",
          hasAside &&
            (asidePosition === "start"
              ? "lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]"
              : "lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]"),
        )}
      >
        {hasAside && asidePosition === "start" ? (
          <aside className={cn(asideSticky && "lg:sticky lg:top-6 lg:self-start", asideClassName)}>
            {aside}
          </aside>
        ) : null}

        <div className={cn("min-w-0 space-y-4 lg:space-y-6", contentClassName)}>
          {children}
        </div>

        {hasAside && asidePosition === "end" ? (
          <aside className={cn(asideSticky && "lg:sticky lg:top-6 lg:self-start", asideClassName)}>
            {aside}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  contentClassName,
  bodyClassName,
  restoreFocusElement,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        onCloseAutoFocus={(event) => {
          if (!restoreFocusElement || !restoreFocusElement.isConnected) {
            return;
          }

          event.preventDefault();

          const focusTarget = restoreFocusElement;
          if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(() => focusTarget.focus());
            return;
          }

          setTimeout(() => focusTarget.focus(), 0);
        }}
        className={cn(
          "flex h-full w-full flex-col sm:max-w-xl",
          contentClassName,
        )}
      >
        <SheetHeader className="pr-8">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className={cn("space-y-4 pr-3", bodyClassName)}>
            {children}
          </div>
        </ScrollArea>

        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}

interface ModuleLayoutComponent extends React.FC<ModuleLayoutProps> {
  Header: typeof ModuleHeader;
  Toolbar: typeof ModuleToolbar;
  Content: typeof ContentArea;
  DetailDrawer: typeof DetailDrawer;
}

export const ModuleLayout = Object.assign(ModuleLayoutRoot, {
  Header: ModuleHeader,
  Toolbar: ModuleToolbar,
  Content: ContentArea,
  DetailDrawer: DetailDrawer,
}) as ModuleLayoutComponent;

export { ContentArea, DetailDrawer, ModuleHeader, ModuleToolbar };
