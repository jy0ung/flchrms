import { useMemo, useState, useCallback } from 'react';
import { Settings2, Pencil, Save, X, GripHorizontal } from 'lucide-react';
import {
  ReactGridLayout,
  useContainerWidth,
  type Layout,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { usePageTitle } from '@/hooks/usePageTitle';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { DashboardWidgetId } from '@/lib/dashboard-layout';
import { GRID_COLUMNS } from '@/lib/dashboard-layout';
import { useDashboardLayout, mergeRglLayoutIntoState } from '@/hooks/useDashboardLayout';
import {
  WIDGET_DEFINITIONS,
} from '@/components/dashboard/dashboard-config';

import { AppPageContainer } from '@/components/system';
import { Button } from '@/components/ui/button';
import { DashboardWidgetRenderer } from '@/components/dashboard/widgets';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { DashboardCustomizePanel } from '@/components/dashboard/DashboardCustomizePanel';
import { cn } from '@/lib/utils';

// ── Grid constants ───────────────────────────────────────────────

const ROW_HEIGHT = 80;
const GRID_MARGIN: [number, number] = [16, 16];

// ── RGL layout helpers ───────────────────────────────────────────

function toRglLayout(
  widgets: { id: DashboardWidgetId; x: number; y: number; w: number; h: number; visible: boolean }[],
): Layout {
  return widgets
    .filter((w) => w.visible)
    .map((w) => {
      const def = WIDGET_DEFINITIONS[w.id];
      return {
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: def?.minW ?? 3,
        maxW: def?.maxW ?? 12,
        minH: 2,
      };
    });
}

// ── Component ────────────────────────────────────────────────────

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<Layout | null>(null);

  const {
    layoutState,
    role,
    isLoading,
    isSaving,
    isResetting,
    saveLayout,
    resetLayout,
  } = useDashboardLayout();

  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 });
  const showManagerWidgets = canViewManagerDashboardWidgets(role);

  // Build RGL layout from persisted state
  const rglLayout = useMemo(() => toRglLayout(layoutState.widgets), [layoutState]);

  // Active layout: draft during editing, persisted otherwise
  const activeLayout = editMode && draftLayout ? draftLayout : rglLayout;

  // Visible widget IDs for rendering (stable reference)
  const visibleIds = useMemo(
    () => layoutState.widgets.filter((w) => w.visible).map((w) => w.id),
    [layoutState],
  );

  // ── Edit mode actions ──────────────────────────────────────────

  const enterEditMode = useCallback(() => {
    setDraftLayout(rglLayout.map((item) => ({ ...item })));
    setEditMode(true);
  }, [rglLayout]);

  const cancelEdit = useCallback(() => {
    setDraftLayout(null);
    setEditMode(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!draftLayout) return;
    const nextState = mergeRglLayoutIntoState(draftLayout, layoutState);
    saveLayout(nextState);
    setDraftLayout(null);
    setEditMode(false);
  }, [draftLayout, layoutState, saveLayout]);

  const onLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (editMode) {
        setDraftLayout([...newLayout]);
      }
    },
    [editMode],
  );

  return (
    <AppPageContainer spacing="comfortable">
      {/* Hero Greeting + action buttons */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <DashboardGreeting role={role} />
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {editMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={enterEditMode}
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setCustomizeOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Widgets</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats — managers and above */}
      {showManagerWidgets && <QuickStats />}

      {/* Widget grid — react-grid-layout */}
      {!isLoading && (
        <div ref={containerRef} className="w-full">
          {mounted && (
            <ReactGridLayout
              width={width}
              layout={activeLayout}
              gridConfig={{
                cols: GRID_COLUMNS,
                rowHeight: ROW_HEIGHT,
                margin: GRID_MARGIN,
                containerPadding: [0, 0],
                maxRows: Infinity,
              }}
              dragConfig={{
                enabled: editMode,
                handle: '.rgl-drag-handle',
              }}
              resizeConfig={{
                enabled: editMode,
                handles: ['se'],
              }}
              onLayoutChange={onLayoutChange}
              autoSize
              className={cn(
                'relative transition-colors duration-200',
                editMode && 'rounded-lg border-2 border-dashed border-primary/30 bg-muted/20 p-1',
              )}
            >
              {visibleIds.map((id) => (
                <div
                  key={id}
                  className={cn(
                    'overflow-hidden rounded-lg',
                    editMode && 'ring-1 ring-primary/20 shadow-sm',
                  )}
                >
                  {editMode && (
                    <div className="rgl-drag-handle flex items-center justify-center gap-1 h-6 bg-muted/80 border-b cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                      <GripHorizontal className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={cn(editMode && 'h-[calc(100%-24px)] overflow-auto')}>
                    <DashboardWidgetRenderer
                      widgetId={id as DashboardWidgetId}
                      role={role}
                    />
                  </div>
                </div>
              ))}
            </ReactGridLayout>
          )}
        </div>
      )}

      {/* Customize panel (Sheet) */}
      <DashboardCustomizePanel
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        layoutState={layoutState}
        role={role}
        onSave={saveLayout}
        onReset={resetLayout}
        isSaving={isSaving}
        isResetting={isResetting}
      />
    </AppPageContainer>
  );
}
