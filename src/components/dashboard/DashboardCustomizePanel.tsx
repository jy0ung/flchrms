/**
 * DashboardCustomizePanel — slide-in sheet for showing/hiding dashboard widgets.
 *
 * Drag-and-drop reordering and resizing are handled in-place on the grid via
 * react-grid-layout. This panel only manages widget visibility.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import {
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';

import type { AppRole } from '@/types/hrms';
import type {
  DashboardWidgetId,
  DashboardLayoutStateV2,
  DashboardLayoutWidgetV2,
} from '@/lib/dashboard-layout';
import { GRID_COLUMNS } from '@/lib/dashboard-layout';
import {
  WIDGET_META,
  WIDGET_ICONS,
  WIDGET_DEFINITIONS,
  DASHBOARD_LAYOUT_PRESET_VERSION,
} from '@/components/dashboard/dashboard-config';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────

interface DashboardCustomizePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutState: DashboardLayoutStateV2;
  role: AppRole;
  onSave: (state: DashboardLayoutStateV2) => void;
  onReset: () => void;
  isSaving?: boolean;
  isResetting?: boolean;
}

interface DraftWidget {
  id: DashboardWidgetId;
  visible: boolean;
  w: number;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
}

// ── Widget row (static, no drag) ──────────────────────────────────

function WidgetRow({
  widget,
  onToggleVisibility,
}: {
  widget: DraftWidget;
  onToggleVisibility: (id: DashboardWidgetId) => void;
}) {
  const Icon = widget.Icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
        !widget.visible && 'opacity-50',
      )}
    >
      {/* Widget icon + info */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-none truncate">{widget.label}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{widget.description}</p>
        </div>
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center gap-1.5">
        {widget.visible ? (
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Switch
          checked={widget.visible}
          onCheckedChange={() => onToggleVisibility(widget.id)}
          aria-label={`${widget.visible ? 'Hide' : 'Show'} ${widget.label}`}
          className="scale-90"
        />
      </div>
    </div>
  );
}

// ── Layout preview ───────────────────────────────────────────────

function LayoutPreview({ widgets }: { widgets: DraftWidget[] }) {
  const visible = widgets.filter((w) => w.visible);

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Layout Preview</p>
      <div className="grid grid-cols-12 gap-1">
        {visible.map((w) => {
          const Icon = w.Icon;
          return (
            <div
              key={w.id}
              className="rounded bg-primary/10 border border-primary/20 p-1.5 flex items-center gap-1 overflow-hidden"
              style={{ gridColumn: `span ${w.w}` }}
              title={w.label}
            >
              <Icon className="h-3 w-3 shrink-0 text-primary/60" />
              <span className="text-[10px] font-medium text-primary/70 truncate">{w.label}</span>
            </div>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="text-xs text-muted-foreground italic text-center py-4">
          No widgets visible. Toggle some widgets on to see them here.
        </p>
      )}
    </div>
  );
}

// ── Main panel component ─────────────────────────────────────────

export function DashboardCustomizePanel({
  open,
  onOpenChange,
  layoutState,
  role,
  onSave,
  onReset,
  isSaving,
  isResetting,
}: DashboardCustomizePanelProps) {
  // ── Draft state ────────────────────────────────────────────────

  const [draftWidgets, setDraftWidgets] = useState<DraftWidget[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Seed draft when panel opens or layoutState changes
  useEffect(() => {
    if (!open) return;

    // Allow only widgets permitted for this role
    const allowedIds = new Set(
      Object.values(WIDGET_DEFINITIONS)
        .filter((def) => def.allowedRoles.includes(role))
        .map((def) => def.id),
    );

    // Build sorted list from layout state
    const sorted = [...layoutState.widgets]
      .filter((w) => allowedIds.has(w.id))
      .sort((a, b) => {
        // Visible comes first, then sort by position
        if (a.visible !== b.visible) return a.visible ? -1 : 1;
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

    // Seed missing widgets (in definitions but not in layout)
    const inLayout = new Set(sorted.map((w) => w.id));
    const missing = [...allowedIds].filter((id) => !inLayout.has(id));
    const allWidgets = [
      ...sorted,
      ...missing.map((id) => ({
        id,
        x: 0,
        y: 999,
        w: WIDGET_DEFINITIONS[id].defaultW,
        h: WIDGET_DEFINITIONS[id].defaultH,
        visible: false,
      })),
    ];

    setDraftWidgets(
      allWidgets.map((w) => ({
        id: w.id,
        visible: w.visible,
        w: w.w,
        label: WIDGET_META[w.id]?.label ?? w.id,
        description: WIDGET_META[w.id]?.description ?? '',
        Icon: WIDGET_ICONS[w.id] ?? (() => null),
      })),
    );

    setShowResetConfirm(false);
  }, [open, layoutState, role]);

  // ── Mutations on draft ─────────────────────────────────────────

  const toggleVisibility = useCallback((id: DashboardWidgetId) => {
    setDraftWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    );
  }, []);

  // ── Commit draft → DashboardLayoutStateV2 ──────────────────────

  const handleSave = useCallback(() => {
    // Build a visibility map from the draft
    const visibilityMap = new Map(draftWidgets.map((w) => [w.id, w.visible]));

    // Update the existing layout state: toggle visibility, append newly-visible
    // widgets that weren't in the layout before at the bottom of the grid.
    const existingIds = new Set(layoutState.widgets.map((w) => w.id));
    const maxY = layoutState.widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

    const updatedWidgets: DashboardLayoutWidgetV2[] = layoutState.widgets.map((w) => ({
      ...w,
      visible: visibilityMap.get(w.id) ?? w.visible,
    }));

    // Append newly-visible widgets that weren't in the existing layout
    let appendY = maxY;
    for (const dw of draftWidgets) {
      if (!existingIds.has(dw.id) && dw.visible) {
        const def = WIDGET_DEFINITIONS[dw.id];
        updatedWidgets.push({
          id: dw.id,
          x: 0,
          y: appendY,
          w: def?.defaultW ?? 4,
          h: def?.defaultH ?? 4,
          visible: true,
        });
        appendY += def?.defaultH ?? 4;
      }
    }

    const nextState: DashboardLayoutStateV2 = {
      version: 2,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      role,
      widgets: updatedWidgets,
    };

    onSave(nextState);
    onOpenChange(false);
  }, [draftWidgets, layoutState, role, onSave, onOpenChange]);

  const handleReset = useCallback(() => {
    onReset();
    onOpenChange(false);
    setShowResetConfirm(false);
  }, [onReset, onOpenChange]);

  // ── Counts ─────────────────────────────────────────────────────

  const visibleCount = useMemo(() => draftWidgets.filter((w) => w.visible).length, [draftWidgets]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Manage Widgets</SheetTitle>
          <SheetDescription>
            Toggle widget visibility. Drag to reorder and resize directly on the dashboard.
            {visibleCount > 0 && (
              <span className="ml-1 text-foreground font-medium">
                {visibleCount} widget{visibleCount > 1 ? 's' : ''} visible
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Layout preview */}
          <LayoutPreview widgets={draftWidgets} />

          <Separator className="my-4" />

          {/* Widget list */}
          <div className="space-y-2">
            {draftWidgets.map((widget) => (
              <WidgetRow
                key={widget.id}
                widget={widget}
                onToggleVisibility={toggleVisibility}
              />
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="flex-row gap-2 pt-4 border-t">
          {showResetConfirm ? (
            <div className="flex items-center gap-2 w-full">
              <p className="text-sm text-muted-foreground flex-1">Reset to default layout?</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting…' : 'Confirm Reset'}
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Done'}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
