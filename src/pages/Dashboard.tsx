import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';

import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/hrms';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { DashboardWidgetId, DashboardTier } from '@/lib/dashboard-layout';
import {
  buildDefaultDashboardLayoutV2,
  splitLayoutByLane,
} from '@/lib/dashboard-layout';
import type { LayoutState } from '@/lib/editable-layout';
import { EDITABLE_LAYOUT_VERSION } from '@/lib/editable-layout';
import type { EditableCanvasItem } from '@/components/system/EditableCanvas';
import {
  formatRoleLabel,
  getScopeLabel,
  ROLE_DEFAULT_WIDGETS,
  ROLE_DEFAULT_WIDGET_WIDTHS,
  WIDGET_DEFINITIONS,
  WIDGET_META,
  WIDGET_ICONS,
  DASHBOARD_LAYOUT_PRESET_VERSION,
  DASHBOARD_TIERS,
  ADMIN_TEMPLATE_APPLICABLE_ROLES,
} from '@/components/dashboard/dashboard-config';

import {
  AppPageContainer,
  useInteractionMode,
  InteractionModeToggle,
  ModeRibbon,
} from '@/components/system';
import { DashboardLane } from '@/components/dashboard/DashboardLane';
import { DashboardWidgetRenderer } from '@/components/dashboard/widgets';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { profile, role } = useAuth();
  const { mode } = useInteractionMode();

  const normalizedRole: AppRole = role ?? 'employee';
  const showManagerWidgets = canViewManagerDashboardWidgets(normalizedRole);
  const isCustomize = mode === 'customize';
  const showAdminTemplate = ADMIN_TEMPLATE_APPLICABLE_ROLES.includes(normalizedRole);

  const widgetIds = ROLE_DEFAULT_WIDGETS[normalizedRole];
  const widgetWidths = ROLE_DEFAULT_WIDGET_WIDTHS[normalizedRole];

  // Build full V2 layout for customize mode lanes
  const defaultLayout = useMemo(
    () =>
      buildDefaultDashboardLayoutV2({
        definitions: WIDGET_DEFINITIONS,
        role: normalizedRole,
        presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
        orderedWidgetIds: widgetIds,
      }),
    [normalizedRole, widgetIds],
  );

  const [layoutState, setLayoutState] = useState(defaultLayout);

  // Split widgets into lanes
  const widgetsByLane = useMemo(
    () => splitLayoutByLane(layoutState, WIDGET_DEFINITIONS),
    [layoutState],
  );

  // Build EditableCanvasItem lists per lane
  const canvasItemsByLane = useMemo(() => {
    const result: Record<DashboardTier, EditableCanvasItem[]> = {
      primary: [],
      secondary: [],
      supporting: [],
    };
    for (const tier of DASHBOARD_TIERS) {
      result[tier] = widgetsByLane[tier]
        .filter((w) => w.visible)
        .map((w) => ({
          id: w.id,
          title: WIDGET_META[w.id].label,
          description: WIDGET_META[w.id].description,
          icon: WIDGET_ICONS[w.id],
          view: (
            <DashboardWidgetRenderer widgetId={w.id} role={normalizedRole} />
          ),
        }));
    }
    return result;
  }, [widgetsByLane, normalizedRole]);

  // Build LayoutState per lane for EditableCanvas
  const layoutStateByLane = useMemo(() => {
    const result: Record<DashboardTier, LayoutState> = {
      primary: { version: EDITABLE_LAYOUT_VERSION, items: [] },
      secondary: { version: EDITABLE_LAYOUT_VERSION, items: [] },
      supporting: { version: EDITABLE_LAYOUT_VERSION, items: [] },
    };
    for (const tier of DASHBOARD_TIERS) {
      result[tier] = {
        version: EDITABLE_LAYOUT_VERSION,
        items: widgetsByLane[tier]
          .filter((w) => w.visible)
          .map((w) => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
      };
    }
    return result;
  }, [widgetsByLane]);

  const handleLaneLayoutChange = useCallback(
    (_tier: DashboardTier) => (_nextState: LayoutState) => {
      // Layout change handling — can be extended for persistence
    },
    [],
  );

  const handleHideItem = useCallback((_itemId: string) => {
    // Hide widget handling — can be extended for persistence
  }, []);

  const handleRestoreHidden = useCallback(() => {
    // Restore hidden widgets — can be extended
    setLayoutState(defaultLayout);
  }, [defaultLayout]);

  const handleApplyAdminTemplate = useCallback(() => {
    // Apply admin template — can be extended
    setLayoutState(defaultLayout);
  }, [defaultLayout]);

  // View-mode flat grid
  const widgetGrid = useMemo(() => {
    return widgetIds.map((id) => {
      const w = widgetWidths[id] ?? 4;
      const colSpan = w >= 12 ? 'lg:col-span-2' : '';
      return { id, colSpan };
    });
  }, [widgetIds, widgetWidths]);

  return (
    <AppPageContainer spacing="comfortable">
      {/* Greeting + Customize toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {profile?.first_name || 'there'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} &middot;{' '}
            {formatRoleLabel(normalizedRole)} &middot;{' '}
            {getScopeLabel(normalizedRole, null)}
          </p>
        </div>
        <InteractionModeToggle
          modes={['customize']}
          includeView={false}
          ariaLabel="Dashboard interaction mode"
          singleModeLabels={{
            activate: 'Customize Dashboard',
            deactivate: 'Done Editing',
          }}
        />
      </div>

      {/* Mode ribbon — visible in customize mode */}
      {isCustomize && (
        <ModeRibbon
          variant="compact"
          descriptions={{
            customize: 'Drag, resize, or hide widgets to personalise your dashboard.',
          }}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg"
                onClick={handleRestoreHidden}
              >
                Restore Hidden
              </Button>
              {showAdminTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={handleApplyAdminTemplate}
                >
                  Apply Admin Template
                </Button>
              )}
            </>
          }
        />
      )}

      {/* Quick Stats — managers and above */}
      {showManagerWidgets && <QuickStats />}

      {/* Customize mode — lane-based layout */}
      {isCustomize ? (
        <div className="space-y-6">
          {DASHBOARD_TIERS.map((tier) => (
            <DashboardLane
              key={tier}
              tier={tier}
              mode={mode}
              items={canvasItemsByLane[tier]}
              layoutState={layoutStateByLane[tier]}
              onLayoutStateChange={handleLaneLayoutChange(tier)}
              onHideItem={handleHideItem}
            />
          ))}
        </div>
      ) : (
        /* View mode — flat widget grid */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {widgetGrid.map(({ id, colSpan }) => (
            <div key={id} className={colSpan}>
              <DashboardWidgetRenderer
                widgetId={id as DashboardWidgetId}
                role={normalizedRole}
              />
            </div>
          ))}
        </div>
      )}
    </AppPageContainer>
  );
}
