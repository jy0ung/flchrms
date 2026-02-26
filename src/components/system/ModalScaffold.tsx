import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ModalScaffoldProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  statusBadge?: React.ReactNode;
  headerMeta?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  showCloseButton?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

const maxWidthClasses: Record<NonNullable<ModalScaffoldProps["maxWidth"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
};

/**
 * Composition-layer modal scaffold built on top of the shared Dialog primitives.
 * Keeps title/status/meta/body/footer hierarchy consistent without changing behavior.
 */
export function ModalScaffold({
  open,
  onOpenChange,
  title,
  description,
  statusBadge,
  headerMeta,
  body,
  footer,
  maxWidth = "lg",
  showCloseButton = true,
  contentClassName,
  bodyClassName,
  headerClassName,
  footerClassName,
}: ModalScaffoldProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(maxWidthClasses[maxWidth], contentClassName)}
      >
        <DialogHeader className={cn(headerClassName)}>
          <div className="flex items-start justify-between gap-3 pr-0">
            <div className="min-w-0 flex-1">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </div>
            {statusBadge ? <div className="shrink-0">{statusBadge}</div> : null}
          </div>
          {headerMeta ? <div className="pt-1">{headerMeta}</div> : null}
        </DialogHeader>

        <DialogBody className={cn(bodyClassName)}>{body}</DialogBody>

        {footer ? <DialogFooter className={cn(footerClassName)}>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

