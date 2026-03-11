import { useMemo, useState, useCallback, useEffect } from 'react';
import { Settings2, Pencil, Save, X, GripHorizontal } from 'lucide-react';
import {
  ReactGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { usePageTitle } from '@/hooks/usePageTitle';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { DashboardWidgetId } from '@/lib/dashboard-layout';
import { GRID_COLUMNS, compactLayoutVertically } from '@/lib/dashboard-layout';
import { useDashboardLayout, mergeRglLayoutIntoState } from '@/hooks/useDashboardLayout';
import {
  WIDGET_DEFINITIONS,
  DASHBOARD_SECTION_META,
  DASHBOARD_SECTION_ORDER,
  DASHBOARD_SECTION_WIDGETS,
} from '@/components/dashboard/dashboard-config';

import { AppPageContainer } from '@/components/system';
import { Button } from '@/components/ui/button';
import {
  ChartsWidget,
  CriticalInsightsWidget,
  DashboardWidgetErrorBoundary,
  DashboardWidgetRenderer,
  PendingActionsWidget,
} from '@/components/dashboard/widgets';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { DashboardDataProvider } from '@/components/dashboard/DashboardDataProvider';
import { DashboardCustomizePanel } from '@/components/dashboard/DashboardCustomizePanel';
import { DashboardSection } from '@/components/dashboard/DashboardSection';

// ── Grid constants ───────────────────────────────────────────────

const ROW_HEIGHT = 72;
const GRID_MARGIN: [number, number] = [12, 12];
const TABLET_GRID_COLUMNS = 6;
const MOBILE_GRID_COLUMNS = 1;
const FEATURED_SUPPORTING_WIDGETS = new Set<DashboardWidgetId>(['announcements', 'recentActivity']);

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getGridColumns(width: number): number {
  if (width < 640) return MOBILE_GRID_COLUMNS;
  if (width < 1024) return TABLET_GRID_COLUMNS;
  return GRID_COLUMNS;
}

function sortWidgetsByPosition(
  widgets: { id: DashboardWidgetId; x: number; y: number; visible: boolean }[],
) {
  return [...widgets].sort((left, right) => {
    if (left.y !== right.y) return left.y - right.y;
    if (left.x !== right.x) return left.x - right.x;
    return left.id.localeCompare(right.id);
  });
}

function getSectionDescription(sectionId: (typeof DASHBOARD_SECTION_ORDER)[number], showManagerWidgets: boolean) {
  if (!showManagerWidgets) {
    switch (sectionId) {
      case 'operationalStatus':
        return 'Your daily attendance, leave, and work status.';
      case 'supportingInformation':
        return 'Updates, personal progress, and schedule context.';
      default:
        return DASHBOARD_SECTION_META[sectionId].description;
    }
  }

  switch (sectionId) {
    case 'alerts':
      return 'Exceptions and risk signals that need awareness before routine work.';
    case 'requiredActions':
      return 'Approvals, reviews, and queue items that need a decision now.';
    case 'operationalStatus':
      return 'Live attendance, staffing, and in-flight workflow conditions.';
    case 'supportingInformation':
      return 'Reference updates and background context that support the day-to-day queue.';
    default:
      return DASHBOARD_SECTION_META[sectionId].description;
  }
}

function getSectionGridClass(sectionId: (typeof DASHBOARD_SECTION_ORDER)[number]) {
  switch (sectionId) {
    case 'operationalStatus':
      return 'grid gap-4 lg:grid-cols-2 xl:grid-cols-3';
    case 'organizationMetrics':
      return 'grid gap-4 xl:grid-cols-2';
    default:
      return 'grid gap-4';
  }
}

function splitSupportingWidgets(widgetIds: DashboardWidgetId[]) {
  return {
    featured: widgetIds.filter((widgetId) => FEATURED_SUPPORTING_WIDGETS.has(widgetId)),
    secondary: widgetIds.filter((widgetId) => !FEATURED_SUPPORTING_WIDGETS.has(widgetId)),
  };
}

// ── RGL layout helpers ───────────────────────────────────────────

function toRglLayout(
  widgets: { id: DashboardWidgetId; x: number; y: number; w: number; h: number; visible: boolean }[],
): Layout {
  const visible = widgets
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
  return compactLayoutVertically(visible);
}

function projectLayoutToColumns(layout: Layout, targetCols: number): Layout {
  if (targetCols === GRID_COLUMNS) {
    return compactLayoutVertically(layout);
  }

  const scale = targetCols / GRID_COLUMNS;
  const projected = layout.map((item) => {
    const w = clamp(Math.round(item.w * scale), 1, targetCols);
    const x = clamp(Math.round(item.x * scale), 0, Math.max(0, targetCols - w));
    return {
      ...item,
      x,
      w,
      minW: 1,
      maxW: targetCols,
    };
  });

  return compactLayoutVertically(projected);
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
  const currentCols = useMemo(() => getGridColumns(width), [width]);
  const canEditLayout = currentCols === GRID_COLUMNS;

  // Build RGL layout from persisted state
  const rglLayout = useMemo(() => toRglLayout(layoutState.widgets), [layoutState]);

  // Active layout: draft during editing, persisted otherwise
  const activeLayout = editMode && draftLayout ? draftLayout : rglLayout;
  const projectedLayout = useMemo(
    () => projectLayoutToColumns(activeLayout, currentCols),
    [activeLayout, currentCols],
  );

  // Visible widget IDs for rendering (stable reference)
  const visibleIds = useMemo(
    () => sortWidgetsByPosition(layoutState.widgets)
      .filter((w) => w.visible)
      .map((w) => w.id),
    [layoutState],
  );

  const dashboardSections = useMemo(
    () => DASHBOARD_SECTION_ORDER.map((sectionId) => ({
      id: sectionId,
      widgetIds: visibleIds.filter((widgetId) => DASHBOARD_SECTION_WIDGETS[sectionId].includes(widgetId)),
    })),
    [visibleIds],
  );

  // ── Edit mode actions ──────────────────────────────────────────

  const enterEditMode = useCallback(() => {
    if (!canEditLayout) return;
    setDraftLayout(rglLayout.map((item) => ({ ...item })));
    setEditMode(true);
  }, [canEditLayout, rglLayout]);

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
      if (editMode && canEditLayout) {
        setDraftLayout([...newLayout]);
      }
    },
    [editMode, canEditLayout],
  );

  useEffect(() => {
    if (editMode && !canEditLayout) {
      setDraftLayout(null);
      setEditMode(false);
    }
  }, [editMode, canEditLayout]);

  return (
    <DashboardDataProvider>
      <AppPageContainer spacing="comfortable" maxWidth="7xl">
        <DashboardGreeting
          role={role}
          actionsSlot={
            editMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-1 h-4 w-4" />
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
                  disabled={!canEditLayout}
                  title={!canEditLayout ? 'Expand browser width to edit dashboard layout.' : undefined}
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
            )
          }
        />

        {!isLoading && !editMode && (
          <div className="space-y-6 md:space-y-7">
            {dashboardSections.map((section) => {
              const meta = DASHBOARD_SECTION_META[section.id];
              const hasContent = section.widgetIds.length > 0;
              const supportingWidgets =
                section.id === 'supportingInformation'
                  ? splitSupportingWidgets(section.widgetIds as DashboardWidgetId[])
                  : null;

              if (!hasContent) return null;

              const renderSectionContent = () => {
                if (section.id === 'alerts') {
                  return section.widgetIds.includes('criticalInsights') ? (
                    <DashboardWidgetErrorBoundary widgetLabel="Critical Insights">
                      <CriticalInsightsWidget role={role} />
                    </DashboardWidgetErrorBoundary>
                  ) : null;
                }

                if (section.id === 'requiredActions') {
                  return section.widgetIds.includes('pendingActions') ? (
                    <DashboardWidgetErrorBoundary widgetLabel="Pending Actions">
                      <PendingActionsWidget role={role} />
                    </DashboardWidgetErrorBoundary>
                  ) : null;
                }

                if (section.id === 'organizationMetrics') {
                  const showSummaryMetrics = showManagerWidgets && section.widgetIds.includes('executiveMetrics');
                  const showAnalytics = section.widgetIds.includes('charts');

                  if (!showSummaryMetrics && !showAnalytics) {
                    return null;
                  }

                  return (
                    <div className="space-y-4">
                      {showSummaryMetrics ? <QuickStats /> : null}
                      {showAnalytics ? (
                        <DashboardWidgetErrorBoundary widgetLabel="Analytics">
                          <ChartsWidget />
                        </DashboardWidgetErrorBoundary>
                      ) : null}
                    </div>
                  );
                }

                if (section.widgetIds.length === 0) {
                  return null;
                }

                if (section.id === 'supportingInformation') {
                  return (
                    <div className="space-y-4">
                      {supportingWidgets && supportingWidgets.featured.length > 0 ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                          {supportingWidgets.featured.map((id) => (
                            <DashboardWidgetRenderer
                              key={`${section.id}-featured-${id}`}
                              widgetId={id}
                              role={role}
                            />
                          ))}
                        </div>
                      ) : null}

                      {supportingWidgets && supportingWidgets.secondary.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {supportingWidgets.secondary.map((id) => (
                            <DashboardWidgetRenderer
                              key={`${section.id}-secondary-${id}`}
                              widgetId={id}
                              role={role}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div className={getSectionGridClass(section.id)}>
                    {section.widgetIds.map((id) => (
                      <DashboardWidgetRenderer
                        key={`${section.id}-${id}`}
                        widgetId={id as DashboardWidgetId}
                        role={role}
                      />
                    ))}
                  </div>
                );
              };

              const sectionContent = renderSectionContent();

              if (!sectionContent) {
                return null;
              }

              return (
                <DashboardSection
                  key={section.id}
                  title={meta.title}
                  description={getSectionDescription(section.id, showManagerWidgets)}
                  contentClassName="space-y-4"
                >
                  {sectionContent}
                </DashboardSection>
              );
            })}
          </div>
        )}

        {/* Edit-mode widget grid — react-grid-layout */}
        {!isLoading && editMode && (
          <div ref={containerRef} className="w-full">
            {mounted && (
              <ReactGridLayout
                width={width}
                layout={projectedLayout}
                gridConfig={{
                  cols: currentCols,
                  rowHeight: ROW_HEIGHT,
                  margin: GRID_MARGIN,
                  containerPadding: [0, 0],
                  maxRows: Infinity,
                }}
                compactor={verticalCompactor}
                dragConfig={{
                  enabled: editMode && canEditLayout,
                  handle: '.rgl-drag-handle',
                }}
                resizeConfig={{
                  enabled: editMode && canEditLayout,
                  handles: ['e', 'w', 'se', 'sw'],
                }}
                onLayoutChange={onLayoutChange}
                autoSize
                className="relative rounded-lg border-2 border-dashed border-primary/30 bg-muted/20 transition-colors duration-200"
              >
                {visibleIds.map((id) => (
                  <div
                    key={id}
                    className="overflow-hidden rounded-lg ring-1 ring-primary/20 shadow-sm"
                  >
                    <div className="rgl-drag-handle flex h-6 cursor-grab items-center justify-center gap-1 border-b bg-muted/80 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing">
                      <GripHorizontal className="h-3.5 w-3.5" />
                    </div>
                    <div className="h-[calc(100%-24px)] overflow-hidden">
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
    </DashboardDataProvider>
  );
}
