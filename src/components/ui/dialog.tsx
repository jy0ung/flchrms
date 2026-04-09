import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type DialogChromeContextValue = {
  showCloseButton: boolean;
  registerHeader: () => void;
  hasHeader: boolean;
  layout: "dialog" | "full-screen";
};

const DialogChromeContext = React.createContext<DialogChromeContextValue | null>(null);

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Darker overlay for professional modals (60% opacity)
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
    layout?: "dialog" | "full-screen";
  }
>(({ className, children, showCloseButton = true, layout = "dialog", ...props }, ref) => {
  const [hasHeader, setHasHeader] = React.useState(false);
  const registerHeader = React.useCallback(() => {
    setHasHeader(true);
  }, []);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-layout={layout}
        data-slot="dialog-content"
        className={cn(
          layout === "full-screen"
            ? "fixed inset-0 z-50 grid h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-4 overflow-y-auto bg-background px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 rounded-none sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:gap-5 sm:rounded-lg sm:border sm:border-border sm:p-6 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]"
            : // Professional modal: clean border, no shadow, adequate padding
              "fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border border-border bg-background p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:max-h-[calc(100vh-2rem)] sm:w-full sm:gap-5 sm:p-6",
          className,
        )}
        {...props}
      >
        <DialogChromeContext.Provider value={{ showCloseButton, registerHeader, hasHeader, layout }}>
          {children}
          {showCloseButton && !hasHeader ? (
            <DialogPrimitive.Close className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground ring-offset-background transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none sm:right-4 sm:top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          ) : null}
        </DialogChromeContext.Provider>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const chrome = React.useContext(DialogChromeContext);

  React.useEffect(() => {
    chrome?.registerHeader();
  }, [chrome]);

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        chrome?.layout === "full-screen"
          ? "relative flex flex-col space-y-1.5 border-b border-border pb-4 pr-10 text-left sm:pb-5"
          : "relative flex flex-col space-y-1.5 border-b border-border pb-4 pr-10 text-center sm:pb-5 sm:text-left",
        className,
      )}
      {...props}
    >
      {children}
      {chrome?.showCloseButton ? (
        <DialogPrimitive.Close className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground ring-offset-background transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      ) : null}
    </div>
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-slot="dialog-body" className={cn("min-h-0 space-y-4", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const chrome = React.useContext(DialogChromeContext);

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        chrome?.layout === "full-screen"
          ? "sticky bottom-0 z-[1] -mx-4 -mb-4 mt-4 flex flex-col-reverse gap-2 border-t border-border bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6 sm:py-4 sm:[&>*]:w-auto [&>*]:w-full"
          : "sticky bottom-0 z-[1] -mx-5 -mb-5 mt-4 flex flex-col-reverse gap-2 border-t border-border bg-background px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6 sm:py-4 sm:[&>*]:w-auto [&>*]:w-full",
        className,
      )}
      {...props}
    />
  );
};
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("pr-8 text-xl font-bold leading-tight tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
