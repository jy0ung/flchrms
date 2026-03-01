import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  Bell,
  Building2,
  Filter,
  Plus,
  RefreshCcw,
  Search,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/hrms';
import {
  canViewExecutiveCriticalDashboard,
  canViewManagerDashboardWidgets,
} from '@/lib/permissions';
import { type LayoutState } from '@/lib/editable-layout';
import {
  SUPPORTED_DASHBOARD_LAYOUT_VERSION,
  TIER_WIDTH_RULES,
  assertDashboardLayoutInvariants,
  buildDefaultDashboardLayoutV2,
  clampWidgetWidthByTier,
  compactLaneWidgets,
  mergeLanesToLayout,
  migrateLegacyDashboardLayoutToV2,
  normalizeDashboardLayoutStateV2,
  splitLayoutByLane,
  type DashboardLayoutStateV2,
  type DashboardTier,
  type DashboardWidgetDefinition,
  type DashboardWidgetId,
  type ResizeRule,
} from '@/lib/dashboard-layout';
import {
  getDashboardEnabledWidgetIds,
  getDashboardLayoutStateV2,
  getDashboardLayoutPresetVersion,
  getDashboardStoredLayoutVersion,
  getDashboardWidgetLayoutState,
  getDashboardWidgetSpanMap,
  setDashboardLayoutPresetVersion,
  setDashboardLayoutStateV2,
  FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY,
  UI_PREFERENCES_CHANGED_EVENT,
} from '@/lib/ui-preferences';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AppPageContainer,
  InteractionModeToggle,
  ModeRibbon,
  PageHeader,
  useInteractionMode,
} from '@/components/system';
import { DashboardLane } from '@/components/dashboard/DashboardLane';
import { DashboardWidgetRenderer } from '@/components/dashboard/widgets';
import {
  ADMIN_TEMPLATE_APPLICABLE_ROLES,
  DASHBOARD_LAYOUT_PRESET_VERSION,
  DASHBOARD_TIERS,
  formatRoleLabel,
  getScopeLabel,
  ROLE_DEFAULT_WIDGETS,
  ROLE_DEFAULT_WIDGET_WIDTHS,
  ROLE_WIDGETS,
  WIDGET_DEFINITIONS,
  WIDGET_ICONS,
  WIDGET_META,
} from '@/components/dashboard/dashboard-config';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { user, profile, role } = useAuth();
  const { is, setMode } = useInteractionMode();
  const isLayoutEditing = is('customize');
  const [layoutState, setLayoutState] = useState<DashboardLayoutStateV2 | null>(null);
  const layoutStateRef = useRef<DashboardLayoutStateV2 | null>(null);
  const navigate = useNavigate();

  const normalizedRole: AppRole = role ?? 'employee';
  const availableWidgetIds = ROLE_WIDGETS[normalizedRole];
  const defaultWidgetIds = ROLE_DEFAULT_WIDGETS[normalizedRole];
  const defaultDimensionsById = useMemo(() => {
    const roleDefaultWidths = ROLE_DEFAULT_WIDGET_WIDTHS[normalizedRole];
    return Object.fromEntries(
      availableWidgetIds.map((widgetId) => [
        widgetId,
        {
          w: roleDefaultWidths?.[widgetId] ?? WIDGET_META[widgetId].defaultWidth,
          h: WIDGET_META[widgetId].defaultHeight,
        },
      ]),
    );
  }, [availableWidgetIds, normalizedRole]);
  const canViewTeamWidgets = canViewManagerDashboardWidgets(normalizedRole);
  const canViewCriticalWidgets = canViewExecutiveCriticalDashboard(normalizedRole);
  const canApplyAdminTemplate = ADMIN_TEMPLATE_APPLICABLE_ROLES.includes(normalizedRole);

  const persistLayoutState = useCallback((nextState: DashboardLayoutStateV2) => {
    if (!user?.id) return;
    setDashboardLayoutStateV2(user.id, normalizedRole, nextState);
    setDashboardLayoutPresetVersion(user.id, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
  }, [user?.id, normalizedRole]);

  const buildDefaultLayout = useCallback(() => {
    return buildDefaultDashboardLayoutV2({
      definitions: WIDGET_DEFINITIONS,
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      orderedWidgetIds: defaultWidgetIds,
      defaultDimensionsById,
      rulesByTier: TIER_WIDTH_RULES,
    });
  }, [defaultDimensionsById, defaultWidgetIds, normalizedRole]);

  const buildAdminTemplateLayout = useCallback(() => {
    const adminTemplateOrder = ROLE_DEFAULT_WIDGETS.admin.filter((widgetId) => availableWidgetIds.includes(widgetId));
    const roleSpecificTail = defaultWidgetIds.filter((widgetId) => !adminTemplateOrder.includes(widgetId));
    const orderedWidgetIds = [...adminTemplateOrder, ...roleSpecificTail];
    const roleDefaultWidths = ROLE_DEFAULT_WIDGET_WIDTHS[normalizedRole];
    const defaultDimensions = Object.fromEntries(
      availableWidgetIds.map((widgetId) => {
        const adminTemplateWidth = ROLE_DEFAULT_WIDGET_WIDTHS.admin[widgetId];
        const roleWidth = roleDefaultWidths?.[widgetId] ?? WIDGET_META[widgetId].defaultWidth;
        return [
          widgetId,
          {
            w: adminTemplateWidth ?? roleWidth,
            h: WIDGET_META[widgetId].defaultHeight,
          },
        ];
      }),
    );

    return buildDefaultDashboardLayoutV2({
      definitions: WIDGET_DEFINITIONS,
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      orderedWidgetIds,
      defaultDimensionsById: defaultDimensions,
      rulesByTier: TIER_WIDTH_RULES,
    });
  }, [availableWidgetIds, defaultWidgetIds, normalizedRole]);

  const applyPresetOrderToLayout = useCallback((current: DashboardLayoutStateV2): DashboardLayoutStateV2 => {
    const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
    const orderIndex = new Map(defaultWidgetIds.map((id, index) => [id, index]));

    const reordered: Partial<Record<DashboardTier, typeof lanes.primary>> = {};
    for (const tier of DASHBOARD_TIERS) {
      const laneWidgets = lanes[tier];
      const visibleWidgets = laneWidgets
        .filter((widget) => widget.visible)
        .sort((a, b) => {
          const aOrder = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const bOrder = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          if (a.y !== b.y) return a.y - b.y;
          return a.x - b.x;
        })
        .map((widget, index) => ({ ...widget, x: 0, y: index }));
      const compactedVisible = compactLaneWidgets(visibleWidgets, tier, TIER_WIDTH_RULES);
      const compactedById = new Map(compactedVisible.map((widget) => [widget.id, widget]));

      reordered[tier] = laneWidgets.map((widget) => {
        if (!widget.visible) return widget;
        const compacted = compactedById.get(widget.id);
        return compacted ? { ...widget, ...compacted } : widget;
      });
    }

    return normalizeDashboardLayoutStateV2({
      state: mergeLanesToLayout(reordered, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION),
      definitions: WIDGET_DEFINITIONS,
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      rulesByTier: TIER_WIDTH_RULES,
    });
  }, [defaultWidgetIds, normalizedRole]);

  const setAndPersistLayout = useCallback((nextState: DashboardLayoutStateV2, shouldPersist = true) => {
    layoutStateRef.current = nextState;
    setLayoutState(nextState);
    if (shouldPersist) {
      persistLayoutState(nextState);
    }
  }, [persistLayoutState]);

  const syncFromStorage = useCallback(() => {
    if (!user?.id || !normalizedRole) return;

    const storedVersion = getDashboardStoredLayoutVersion(user.id, normalizedRole);
    if (storedVersion !== null && storedVersion > SUPPORTED_DASHBOARD_LAYOUT_VERSION) {
      console.warn(
        `[dashboard-layout] Unsupported layout version ${storedVersion}; resetting to defaults for role ${normalizedRole}.`,
      );
      const defaults = buildDefaultLayout();
      setAndPersistLayout(defaults, true);
      return;
    }

    const storedPreset = getDashboardLayoutPresetVersion(user.id, normalizedRole);
    const storedV2 = getDashboardLayoutStateV2(user.id, normalizedRole);
    const hasPresetDrift =
      storedPreset !== DASHBOARD_LAYOUT_PRESET_VERSION ||
      storedV2?.presetVersion !== DASHBOARD_LAYOUT_PRESET_VERSION;

    if (storedV2) {
      const normalizedStored = normalizeDashboardLayoutStateV2({
        state: storedV2,
        definitions: WIDGET_DEFINITIONS,
        role: normalizedRole,
        presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
        rulesByTier: TIER_WIDTH_RULES,
      });
      const next = hasPresetDrift ? applyPresetOrderToLayout(normalizedStored) : normalizedStored;
      const shouldPersist = hasPresetDrift || JSON.stringify(storedV2) !== JSON.stringify(next);
      setAndPersistLayout(next, shouldPersist);
      return;
    }

    const legacyEnabled = getDashboardEnabledWidgetIds(
      user.id,
      normalizedRole,
      availableWidgetIds,
      defaultWidgetIds,
    ) as DashboardWidgetId[];
    const legacySpanMap = getDashboardWidgetSpanMap(
      user.id,
      normalizedRole,
      availableWidgetIds,
      Object.fromEntries(availableWidgetIds.map((widgetId) => [widgetId, 1])),
    ) as Record<DashboardWidgetId, number>;
    const legacyLayoutState = getDashboardWidgetLayoutState(user.id, normalizedRole);
    const legacyWidthById = Object.fromEntries(
      availableWidgetIds.map((widgetId) => {
        const legacyValue = legacySpanMap[widgetId];
        if (legacyValue >= 4) {
          return [widgetId, legacyValue];
        }
        if (legacyValue === 2) {
          return [widgetId, 8];
        }
        if (legacyValue === 3) {
          return [widgetId, 12];
        }
        return [widgetId, 4];
      }),
    ) as Partial<Record<DashboardWidgetId, number>>;

    const migrated = migrateLegacyDashboardLayoutToV2({
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      definitions: WIDGET_DEFINITIONS,
      legacyLayoutItems: legacyLayoutState?.items ?? null,
      legacyEnabledWidgetIds: legacyEnabled,
      legacyWidthById,
      defaultOrderedWidgetIds: defaultWidgetIds,
      rulesByTier: TIER_WIDTH_RULES,
    });
    setAndPersistLayout(migrated, true);
  }, [
    applyPresetOrderToLayout,
    buildDefaultLayout,
    defaultDimensionsById,
    defaultWidgetIds,
    availableWidgetIds,
    normalizedRole,
    setAndPersistLayout,
    user?.id,
  ]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id || !normalizedRole) return;

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY ||
        event.key.includes(`hrms.ui.dashboard.layoutPresetVersion.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.dashboard.widgets.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.dashboard.widgetSpans.${user.id}.${normalizedRole}`) ||
        event.key.includes(`hrms.ui.dashboard.layout.${user.id}.${normalizedRole}`)
      ) {
        syncFromStorage();
      }
    };

    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, syncFromStorage as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, syncFromStorage as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id, normalizedRole, syncFromStorage]);

  const effectiveLayoutState = useMemo(() => {
    if (layoutState) return layoutState;
    return buildDefaultLayout();
  }, [buildDefaultLayout, layoutState]);

  const widgetById = useMemo(
    () => new Map(effectiveLayoutState.widgets.map((widget) => [widget.id, widget])),
    [effectiveLayoutState.widgets],
  );
  const hiddenWidgetIds = useMemo(() => {
    return availableWidgetIds.filter((widgetId) => !widgetById.get(widgetId)?.visible);
  }, [availableWidgetIds, widgetById]);
  const hiddenWidgetCount = hiddenWidgetIds.length;
  const scopeLabel = getScopeLabel(normalizedRole, null);
  const headerChips = useMemo(() => {
    const chips: { id: string; label: string; tone?: 'neutral' | 'info' }[] = [];
    if (canViewTeamWidgets) {
      chips.push({ id: 'chip-team-visibility', label: 'Team visibility enabled' });
    }
    if (canViewCriticalWidgets) {
      chips.push({ id: 'chip-critical-insights', label: 'Critical insights enabled', tone: 'info' });
    }
    if (hiddenWidgetCount > 0) {
      chips.push({
        id: 'chip-hidden-widgets',
        label: `${hiddenWidgetCount} hidden widget${hiddenWidgetCount > 1 ? 's' : ''}`,
      });
    }
    return chips;
  }, [canViewCriticalWidgets, canViewTeamWidgets, hiddenWidgetCount]);

  const commitMutation = useCallback((mutator: (current: DashboardLayoutStateV2) => DashboardLayoutStateV2) => {
    const current = layoutStateRef.current ?? effectiveLayoutState;
    const nextRaw = mutator(current);
    const normalized = normalizeDashboardLayoutStateV2({
      state: nextRaw,
      definitions: WIDGET_DEFINITIONS,
      role: normalizedRole,
      presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
      rulesByTier: TIER_WIDTH_RULES,
    });
    assertDashboardLayoutInvariants(normalized, WIDGET_DEFINITIONS, TIER_WIDTH_RULES);
    setAndPersistLayout(normalized, true);
  }, [effectiveLayoutState, normalizedRole, setAndPersistLayout]);

  const compactLaneAfterMutation = useCallback(
    (laneWidgets: DashboardLayoutStateV2['widgets'], tier: DashboardTier) => {
      const visible = laneWidgets.filter((widget) => widget.visible);
      const compactedVisible = compactLaneWidgets(visible, tier, TIER_WIDTH_RULES);
      const compactedById = new Map(compactedVisible.map((widget) => [widget.id, widget]));
      return laneWidgets.map((widget) => {
        if (!widget.visible) return { ...widget, x: 0, y: 0 };
        const compacted = compactedById.get(widget.id);
        return compacted ? { ...widget, ...compacted } : widget;
      });
    },
    [],
  );

  const handleHideWidget = useCallback((widgetId: DashboardWidgetId) => {
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const tier = WIDGET_DEFINITIONS[widgetId].defaultTier;
      lanes[tier] = compactLaneAfterMutation(
        lanes[tier].map((widget) =>
          widget.id === widgetId ? { ...widget, visible: false, x: 0, y: 0 } : widget,
        ),
        tier,
      );
      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, normalizedRole]);

  const handleRestoreWidget = useCallback((widgetId: DashboardWidgetId) => {
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const definition = WIDGET_DEFINITIONS[widgetId];
      const tier = definition.defaultTier;
      const lane = [...lanes[tier]];
      const existing = lane.find((widget) => widget.id === widgetId);
      const maxY = lane.reduce((acc, widget) => (widget.visible ? Math.max(acc, widget.y) : acc), -1);
      const width = clampWidgetWidthByTier(existing?.w ?? definition.defaultW, tier, TIER_WIDTH_RULES);

      if (existing) {
        lanes[tier] = compactLaneAfterMutation(
          lane.map((widget) =>
            widget.id === widgetId
              ? { ...widget, visible: true, x: 0, y: maxY + 1, w: width, h: definition.defaultH }
              : widget,
          ),
          tier,
        );
      } else {
        lanes[tier] = compactLaneAfterMutation(
          [
            ...lane,
            {
              id: widgetId,
              x: 0,
              y: maxY + 1,
              w: width,
              h: definition.defaultH,
              visible: true,
            },
          ],
          tier,
        );
      }

      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, normalizedRole]);

  const handleRestoreAllHidden = useCallback(() => {
    if (hiddenWidgetIds.length === 0) return;
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const hiddenByTier = DASHBOARD_TIERS.flatMap((tier) =>
        defaultWidgetIds.filter((widgetId) => hiddenWidgetIds.includes(widgetId) && WIDGET_DEFINITIONS[widgetId].defaultTier === tier),
      );

      for (const widgetId of hiddenByTier) {
        const definition = WIDGET_DEFINITIONS[widgetId];
        const tier = definition.defaultTier;
        const lane = [...lanes[tier]];
        const maxY = lane.reduce((acc, widget) => (widget.visible ? Math.max(acc, widget.y) : acc), -1);
        const existing = lane.find((widget) => widget.id === widgetId);
        const width = clampWidgetWidthByTier(existing?.w ?? definition.defaultW, tier, TIER_WIDTH_RULES);
        if (existing) {
          lanes[tier] = lane.map((widget) =>
            widget.id === widgetId
              ? { ...widget, visible: true, x: 0, y: maxY + 1, w: width, h: definition.defaultH }
              : widget,
          );
        } else {
          lanes[tier] = [
            ...lane,
            {
              id: widgetId,
              x: 0,
              y: maxY + 1,
              w: width,
              h: definition.defaultH,
              visible: true,
            },
          ];
        }
      }

      for (const tier of DASHBOARD_TIERS) {
        lanes[tier] = compactLaneAfterMutation(lanes[tier], tier);
      }

      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, defaultWidgetIds, hiddenWidgetIds, normalizedRole]);

  const handleResetWidgets = () => {
    if (!user?.id) return;
    const defaults = buildDefaultLayout();
    setAndPersistLayout(defaults, true);
  };

  const handleApplyAdminTemplate = useCallback(() => {
    if (!canApplyAdminTemplate) return;
    const template = buildAdminTemplateLayout();
    setAndPersistLayout(template, true);
  }, [buildAdminTemplateLayout, canApplyAdminTemplate, setAndPersistLayout]);

  const laneLayouts = useMemo(() => {
    const split = splitLayoutByLane(effectiveLayoutState, WIDGET_DEFINITIONS);
    const result: Record<DashboardTier, LayoutState> = {
      primary: { version: 1, items: [] },
      secondary: { version: 1, items: [] },
      supporting: { version: 1, items: [] },
    };

    for (const tier of DASHBOARD_TIERS) {
      result[tier] = {
        version: 1,
        items: split[tier]
          .filter((widget) => widget.visible)
          .map((widget) => ({
            id: widget.id,
            x: widget.x,
            y: widget.y,
            w: widget.w,
            h: widget.h,
          })),
      };
    }

    return result;
  }, [effectiveLayoutState]);

  const laneItems = useMemo(() => {
    const split = splitLayoutByLane(effectiveLayoutState, WIDGET_DEFINITIONS);
    const result: Record<DashboardTier, Array<{
      id: DashboardWidgetId;
      title: string;
      description: string;
      icon: ComponentType<{ className?: string }>;
      view: ReactNode;
    }>> = {
      primary: [],
      secondary: [],
      supporting: [],
    };

    for (const tier of DASHBOARD_TIERS) {
      result[tier] = split[tier]
        .filter((widget) => widget.visible)
        .map((widget) => ({
          id: widget.id,
          title: WIDGET_META[widget.id].label,
          description: WIDGET_META[widget.id].description,
          icon: WIDGET_ICONS[widget.id] as ComponentType<{ className?: string }>,
          view: <DashboardWidgetRenderer widgetId={widget.id} role={normalizedRole} />,
        }));
    }
    return result;
  }, [effectiveLayoutState, normalizedRole]);

  const resizeRulesById = useMemo(() => {
    return Object.fromEntries(
      availableWidgetIds.map((widgetId) => {
        const tier = WIDGET_DEFINITIONS[widgetId].defaultTier;
        return [widgetId, TIER_WIDTH_RULES[tier] as ResizeRule];
      }),
    ) as Record<DashboardWidgetId, ResizeRule>;
  }, [availableWidgetIds]);

  const handleLaneLayoutChange = useCallback((tier: DashboardTier, nextLaneLayout: LayoutState) => {
    commitMutation((current) => {
      const lanes = splitLayoutByLane(current, WIDGET_DEFINITIONS);
      const nextById = new Map(nextLaneLayout.items.map((item) => [item.id, item]));
      lanes[tier] = compactLaneAfterMutation(
        lanes[tier].map((widget) => {
          if (!widget.visible) return widget;
          const next = nextById.get(widget.id);
          if (!next) return widget;
          return {
            ...widget,
            x: next.x,
            y: next.y,
            w: clampWidgetWidthByTier(next.w, tier, TIER_WIDTH_RULES),
            h: widget.h,
          };
        }),
        tier,
      );
      return mergeLanesToLayout(lanes, normalizedRole, DASHBOARD_LAYOUT_PRESET_VERSION);
    });
  }, [commitMutation, compactLaneAfterMutation, normalizedRole]);

  return (
    <AppPageContainer spacing="comfortable">
      <PageHeader
        shellDensity="compact"
        title={`Welcome back, ${profile?.first_name || 'there'}!`}
        description={`${format(new Date(), 'EEEE, MMMM d, yyyy')} â€¢ ${formatRoleLabel(normalizedRole)} dashboard â€¢ ${scopeLabel}`}
        chips={headerChips}
        actionsSlot={(
          <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search anything..."
                className="h-9 w-full rounded-xl pl-9 sm:w-[210px]"
                aria-label="Dashboard quick search"
              />
            </div>
            <Button variant="outline" className="h-9 rounded-xl" onClick={() => navigate('/leave')}>
              <Plus className="mr-2 h-4 w-4" />
              Quick Action
            </Button>
            <InteractionModeToggle
              modes={['customize']}
              includeView={false}
              ariaLabel="Dashboard interaction mode"
              labels={{ customize: 'Customize' }}
              singleModeLabels={{ activate: 'Customize', deactivate: 'Done Editing' }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              aria-label="Open notifications"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <ModeRibbon
        variant="compact"
        sticky
        hideDescription
        dismissLabel="Exit"
        labelOverride={{ customize: 'Customize' }}
        actions={(
          <>
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
              {hiddenWidgetCount} hidden
            </Badge>
            {canApplyAdminTemplate ? (
              <Button variant="outline" className="h-8 rounded-lg px-2.5 text-xs" onClick={handleApplyAdminTemplate}>
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                Apply Admin Template
              </Button>
            ) : null}
            <Button variant="outline" className="h-8 rounded-lg px-2.5 text-xs" onClick={handleResetWidgets}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Role Defaults
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs"
                  disabled={hiddenWidgetIds.length === 0}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Restore Hidden
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(92vw,22rem)] p-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hidden Widgets
                  </p>
                  {hiddenWidgetIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hidden widgets.</p>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full justify-start rounded-lg text-xs"
                        onClick={handleRestoreAllHidden}
                      >
                        Restore all hidden
                      </Button>
                      <div className="max-h-56 space-y-1 overflow-auto pr-1">
                        {hiddenWidgetIds.map((widgetId) => (
                          <Button
                            key={widgetId}
                            type="button"
                            variant="ghost"
                            className="h-8 w-full justify-start rounded-lg text-xs"
                            onClick={() => handleRestoreWidget(widgetId)}
                          >
                            {WIDGET_META[widgetId].label}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      />

      {availableWidgetIds.length === 0 ? (
        <Card className="card-stat border-border/60 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20">
              <Filter className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No dashboard widgets visible</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have hidden all widgets for this role. Enable customize mode to restore widgets or reset the role defaults.
            </p>
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Button className="rounded-lg" onClick={() => setMode('customize')}>
                Customize Dashboard
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={handleResetWidgets}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {DASHBOARD_TIERS.map((tier) => (
            <DashboardLane
              key={tier}
              tier={tier}
              mode={isLayoutEditing ? 'customize' : 'view'}
              items={laneItems[tier]}
              layoutState={laneLayouts[tier]}
              onLayoutStateChange={(nextLaneState) => handleLaneLayoutChange(tier, nextLaneState)}
              onHideItem={(itemId) => handleHideWidget(itemId as DashboardWidgetId)}
              resizeRulesById={resizeRulesById}
            />
          ))}
        </div>
      )}
    </AppPageContainer>
  );
}
