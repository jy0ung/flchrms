import { ChevronDown, ChevronUp, Loader2, Settings, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContextChip, SurfaceSection } from "@/components/system";

interface NotificationMaintenancePanelProps {
  cleanupDays: number;
  onCleanupDaysChange: (days: number) => void;
  onCleanup: () => void;
  onOpenSettings: () => void;
  isDeleting: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationMaintenancePanel({
  cleanupDays,
  onCleanupDaysChange,
  onCleanup,
  onOpenSettings,
  isDeleting,
  open,
  onOpenChange,
}: NotificationMaintenancePanelProps) {
  return (
    <SurfaceSection
      title="Inbox maintenance"
      description="Cleanup and preference controls stay available, but outside the primary reading workflow."
      className="border-dashed bg-muted/[0.18]"
      actions={(
        <Button
          type="button"
          variant="ghost"
          className="h-9 rounded-full"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls="notification-maintenance-tools"
        >
          {open ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
          {open ? 'Hide inbox tools' : 'Show inbox tools'}
        </Button>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <ContextChip className="rounded-full">
            Cleanup window: {cleanupDays} days
          </ContextChip>
          <ContextChip className="rounded-full">
            Preferences live in Profile
          </ContextChip>
        </div>

        {open ? (
          <div
            id="notification-maintenance-tools"
            className="flex flex-col gap-4 border-t border-border/60 pt-4 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="grid gap-2 sm:max-w-[220px]">
              <label className="text-sm font-medium text-foreground" htmlFor="notification-cleanup-window">
                Cleanup read notifications
              </label>
              <Select value={String(cleanupDays)} onValueChange={(value) => onCleanupDaysChange(Number(value))}>
                <SelectTrigger
                  id="notification-cleanup-window"
                  aria-label="Select notification cleanup window"
                  className="h-9 rounded-full"
                >
                  <SelectValue placeholder="Cleanup window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Older than 30 days</SelectItem>
                  <SelectItem value="90">Older than 90 days</SelectItem>
                  <SelectItem value="180">Older than 180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Button
                variant="outline"
                className="h-9 rounded-full"
                onClick={onCleanup}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Cleanup read items
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full"
                onClick={onOpenSettings}
              >
                <Settings className="mr-2 h-4 w-4" />
                Notification settings
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Open this section when you need retention cleanup or notification preference settings.
          </p>
        )}
      </div>
    </SurfaceSection>
  );
}
