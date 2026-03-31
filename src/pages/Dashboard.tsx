import { useMemo, useState, useCallback, useEffect } from 'react';
import { Settings2, Pencil, Save, X, GripHorizontal } from 'lucide-react';
import {
  ReactGridLayout,
  verticalCompactor,
  type Layout,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { usePageTitle } from '@/hooks/usePageTitle';
import { useTodayAttendance } from '@/hooks/useAttendance';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useMyEnrollments } from '@/hooks/useTraining';
import { useMyReviews } from '@/hooks/usePerformance';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMeasuredContainerWidth } from '@/hooks/useMeasuredContainerWidth';
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

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { DashboardGettingStarted } from '@/components/dashboard/DashboardGettingStarted';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { UtilityLayout } from '@/layouts/UtilityLayout';

// ── Grid constants ───────────────────────────────────────────────

const ROW_HEIGHT = 72;
const GRID_MARGIN: [number, number] = [12, 12];
const TABLET_GRID_COLUMNS = 6;
const MOBILE_GRID_COLUMNS = 1;
const FEATURED_SUPPORTING_WIDGETS = new Set<DashboardWidgetId>(['announcements', 'recentActivity']);
const PRIORITY_SECTIONS = new Set(['alerts', 'requiredActions']);

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

function getSectionEyebrow(
  sectionId: (typeof DASHBOARD_SECTION_ORDER)[number],
  hasPrioritySections: boolean,
) {
  switch (sectionId) {
    case 'alerts':
      return 'High priority';
    case 'requiredActions':
      return 'Act now';
    case 'operationalStatus':
      return hasPrioritySections ? 'Scan now' : 'Act first';
    case 'organizationMetrics':
      return 'Monitor';
    case 'supportingInformation':
      return 'Reference';
    default:
      return undefined;
  }
}

function getSectionVariant(
  sectionId: (typeof DASHBOARD_SECTION_ORDER)[number],
  hasPrioritySections: boolean,
): 'default' | 'priority' | 'subtle' {
  if (sectionId === 'alerts' || sectionId === 'requiredActions') {
    return 'priority';
  }

  if (sectionId === 'operationalStatus' && !hasPrioritySections) {
    return 'priority';
  }

  if (sectionId === 'supportingInformation') {
    return 'subtle';
  }

  return 'default';
}

function getSectionContentClass(
  sectionId: (typeof DASHBOARD_SECTION_ORDER)[number],
  hasPrioritySections: boolean,
) {
  if (sectionId === 'alerts' || sectionId === 'requiredActions') {
    return 'space-y-4 [&_.group\\/widget]:border-primary/20 [&_.group\\/widget]:shadow-md';
  }

  if (sectionId === 'operationalStatus' && !hasPrioritySections) {
    return 'space-y-4 [&_.group\\/widget]:border-primary/15 [&_.group\\/widget]:shadow-md';
  }

  return 'space-y-4';
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

  const { width, containerRef, mounted } = useMeasuredContainerWidth({ initialWidth: 1200 });
  const isMobile = useIsMobile();
  const showManagerWidgets = canViewManagerDashboardWidgets(role);
  const currentCols = useMemo(() => getGridColumns(width), [width]);
  const canEditLayout = currentCols === GRID_COLUMNS;
  const { data: todayAttendance } = useTodayAttendance();
  const { data: leaveBalances, isLoading: leaveBalancesLoading } = useLeaveBalance();
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: reviews, isLoading: reviewsLoading } = useMyReviews();

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
  const hasPrioritySections = useMemo(
    () => dashboardSections.some((section) => PRIORITY_SECTIONS.has(section.id) && section.widgetIds.length > 0),
    [dashboardSections],
  );

  const hasMeaningfulLeaveSignal = useMemo(
    () => (leaveBalances ?? []).some((balance) =>
      balance.is_unlimited
      || balance.days_remaining > 0
      || balance.days_used > 0
      || balance.days_pending > 0),
    [leaveBalances],
  );

  const showGettingStartedDashboard = useMemo(() => {
    if (showManagerWidgets || isLoading || editMode) return false;
    if (leaveBalancesLoading || enrollmentsLoading || reviewsLoading) return false;

    return !todayAttendance
      && !hasMeaningfulLeaveSignal
      && (enrollments?.length ?? 0) === 0
      && (reviews?.length ?? 0) === 0;
  }, [
    editMode,
    enrollments,
    enrollmentsLoading,
    hasMeaningfulLeaveSignal,
    isLoading,
    leaveBalancesLoading,
    reviews,
    reviewsLoading,
    showManagerWidgets,
    todayAttendance,
  ]);

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
      <UtilityLayout
        archetype="task-dashboard"
        eyebrow="Workspace"
        title="Dashboard"
        description={
          showManagerWidgets
            ? 'Review urgent actions, live operational status, and reference insight from one workspace.'
            : 'Start with today’s tasks, then scan status and reference updates from one workspace.'
        }
        actionsSlot={
          editMode ? (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button variant="ghost" size="sm" className="h-9 rounded-full" onClick={cancelEdit}>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" className="h-9 rounded-full" onClick={handleSave} disabled={isSaving}>
                <Save className="mr-1 h-4 w-4" />
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-full"
                  aria-label="Customize dashboard"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>Customize</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Dashboard tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    enterEditMode();
                  }}
                  disabled={!canEditLayout}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit layout
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setCustomizeOpen(true);
                  }}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Manage widgets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
        leadSlot={<DashboardGreeting role={role} headingLevel={2} />}
      >

        {!isLoading && !editMode && showGettingStartedDashboard && (
          <DashboardGettingStarted />
        )}

        {!isLoading && !editMode && !showGettingStartedDashboard && (
          <div className="space-y-6 md:space-y-7">
            {(() => {
              const renderDashboardSection = (section: (typeof dashboardSections)[number]) => {
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
                        <div className="grid gap-4 xl:grid-cols-2 [&_.group\\/widget]:shadow-sm">
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
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&_.group\\/widget]:border-border/60 [&_.group\\/widget]:bg-background/80 [&_.group\\/widget]:shadow-none">
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
                  eyebrow={getSectionEyebrow(section.id, hasPrioritySections)}
                  title={meta.title}
                  description={getSectionDescription(section.id, showManagerWidgets)}
                  variant={getSectionVariant(section.id, hasPrioritySections)}
                  contentClassName={getSectionContentClass(section.id, hasPrioritySections)}
                >
                  {sectionContent}
                </DashboardSection>
              );
              };

              const prioritySections = dashboardSections.filter(
                (section) => PRIORITY_SECTIONS.has(section.id) && section.widgetIds.length > 0,
              );
              const secondarySections = dashboardSections.filter(
                (section) => !PRIORITY_SECTIONS.has(section.id) && section.widgetIds.length > 0,
              );

              return (
                <>
                  {prioritySections.length > 0 ? (
                    <div
                      className={
                        prioritySections.length > 1
                          ? 'grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]'
                          : 'space-y-4'
                      }
                    >
                      {prioritySections.map(renderDashboardSection)}
                    </div>
                  ) : null}

                  {secondarySections.map(renderDashboardSection)}
                </>
              );
            })()}
          </div>
        )}

        {/* Edit-mode widget grid — react-grid-layout */}
        {!isLoading && editMode && (
          <div ref={containerRef} className="w-full">
            {mounted && width > 0 && (
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
                className="dashboard-edit-grid"
              >
                {visibleIds.map((id) => (
                  <div
                    key={id}
                    className="dashboard-edit-widget overflow-hidden rounded-lg ring-1 ring-primary/20 shadow-sm"
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
      </UtilityLayout>
    </DashboardDataProvider>
  );
}
