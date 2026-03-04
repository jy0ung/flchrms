/**
 * useDashboardLayout — data hook for per-user dashboard layout preferences.
 *
 * Read priority: Supabase → localStorage → role defaults.
 * Write: upsert to Supabase + mirror to localStorage (offline cache).
 * Reset: delete server row + clear localStorage → fall back to defaults.
 */
import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/hrms';
import type { DashboardWidgetId, DashboardLayoutStateV2 } from '@/lib/dashboard-layout';
import {
  buildDefaultDashboardLayoutV2,
  normalizeDashboardLayoutStateV2,
  isDashboardLayoutStateV2,
} from '@/lib/dashboard-layout';
import {
  WIDGET_DEFINITIONS,
  ROLE_DEFAULT_WIDGETS,
  DASHBOARD_LAYOUT_PRESET_VERSION,
} from '@/components/dashboard/dashboard-config';
import {
  getDashboardLayoutStateV2,
  setDashboardLayoutStateV2,
  resetDashboardWidgetLayoutState,
  resetDashboardEnabledWidgetIds,
  resetDashboardWidgetSpanMap,
} from '@/lib/ui-preferences';

// ── Query key ────────────────────────────────────────────────────

const QUERY_KEY_PREFIX = 'dashboard-layout';

function queryKey(userId: string | undefined) {
  return [QUERY_KEY_PREFIX, userId] as const;
}

// ── Helpers ──────────────────────────────────────────────────────

function buildDefaults(role: AppRole): DashboardLayoutStateV2 {
  return buildDefaultDashboardLayoutV2({
    definitions: WIDGET_DEFINITIONS,
    role,
    presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
    orderedWidgetIds: ROLE_DEFAULT_WIDGETS[role],
  });
}

function normalizeLayout(state: DashboardLayoutStateV2, role: AppRole): DashboardLayoutStateV2 {
  return normalizeDashboardLayoutStateV2({
    state,
    definitions: WIDGET_DEFINITIONS,
    role,
    presetVersion: DASHBOARD_LAYOUT_PRESET_VERSION,
  });
}

function parseServerLayoutState(raw: unknown): DashboardLayoutStateV2 | null {
  if (!raw) return null;
  // If raw is a string (shouldn't happen with jsonb), parse it
  const obj = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  if (!obj) return null;
  if (isDashboardLayoutStateV2(obj)) return obj;
  return null;
}

/**
 * Returns true when the saved layout is stale (preset version < current).
 * Stale layouts should be replaced with fresh role defaults.
 */
function isPresetStale(state: DashboardLayoutStateV2): boolean {
  return (
    typeof state.presetVersion !== 'number' ||
    state.presetVersion < DASHBOARD_LAYOUT_PRESET_VERSION
  );
}

// ── RGL ↔ V2 conversion helpers ──────────────────────────────────

export interface RglLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
}

/**
 * Merge an RGL layout (after drag/resize) back into the persisted state.
 * Hidden widgets are kept unchanged.
 */
export function mergeRglLayoutIntoState(
  rglLayout: readonly RglLayoutItem[],
  state: DashboardLayoutStateV2,
): DashboardLayoutStateV2 {
  const posMap = new Map(rglLayout.map((item) => [item.i, item]));
  const widgets = state.widgets.map((w) => {
    const pos = posMap.get(w.id);
    if (!pos) return w; // hidden → untouched
    return { ...w, x: pos.x, y: pos.y, w: pos.w, h: pos.h };
  });
  return { ...state, widgets };
}

// ── Derived view types ───────────────────────────────────────────

export interface DashboardLayoutWidget {
  id: DashboardWidgetId;
  w: number;
  visible: boolean;
}

export interface DashboardLayoutView {
  /** Visible widgets in render order (sorted by y then x). */
  visibleWidgets: DashboardLayoutWidget[];
  /** All widgets including hidden, for the customize panel. */
  allWidgets: DashboardLayoutWidget[];
  /** The full V2 state for mutation inputs. */
  layoutState: DashboardLayoutStateV2;
}

// ── Main hook ────────────────────────────────────────────────────

export function useDashboardLayout() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const normalizedRole: AppRole = role ?? 'employee';
  const userId = user?.id;

  // ── Read ─────────────────────────────────────────────────────

  const layoutQuery = useQuery({
    queryKey: queryKey(userId),
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5 min
    queryFn: async (): Promise<DashboardLayoutStateV2> => {
      // 1. Try server
      const { data: serverRow, error } = await supabase
        .from('dashboard_preferences')
        .select('layout_state, preset_version')
        .maybeSingle();

      if (error) {
        console.warn('[useDashboardLayout] server fetch failed, falling back to localStorage', error);
      }

      if (!error && serverRow) {
        const parsed = parseServerLayoutState(serverRow.layout_state);
        if (parsed) {
          // Discard stale layouts when preset version is outdated
          if (isPresetStale(parsed)) {
            console.info('[useDashboardLayout] preset version stale, rebuilding defaults');
            const defaults = buildDefaults(normalizedRole);
            if (userId) setDashboardLayoutStateV2(userId, normalizedRole, defaults);
            return defaults;
          }
          const normalized = normalizeLayout(parsed, normalizedRole);
          // Mirror to localStorage for offline access
          if (userId) setDashboardLayoutStateV2(userId, normalizedRole, normalized);
          return normalized;
        }
      }

      // 2. Try localStorage
      if (userId) {
        const local = getDashboardLayoutStateV2(userId, normalizedRole);
        if (local) {
          // Discard stale cached layouts
          if (isPresetStale(local)) {
            console.info('[useDashboardLayout] localStorage preset stale, rebuilding defaults');
            resetDashboardWidgetLayoutState(userId, normalizedRole);
            return buildDefaults(normalizedRole);
          }
          return normalizeLayout(local, normalizedRole);
        }
      }

      // 3. Build defaults
      return buildDefaults(normalizedRole);
    },
  });

  // ── Derived view ─────────────────────────────────────────────

  const layoutState = layoutQuery.data ?? buildDefaults(normalizedRole);

  const view: DashboardLayoutView = useMemo(() => {
    const sorted = [...layoutState.widgets].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return 0;
    });

    const allWidgets: DashboardLayoutWidget[] = sorted.map((w) => ({
      id: w.id,
      w: w.w,
      visible: w.visible,
    }));

    const visibleWidgets = allWidgets.filter((w) => w.visible);

    return { visibleWidgets, allWidgets, layoutState };
  }, [layoutState]);

  // ── Save mutation ────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (nextState: DashboardLayoutStateV2) => {
      if (!userId) throw new Error('Authentication required.');

      const normalized = normalizeLayout(nextState, normalizedRole);

      const { error } = await supabase
        .from('dashboard_preferences')
        .upsert(
          {
            user_id: userId,
            layout_state: normalized as unknown as Json,
            preset_version: DASHBOARD_LAYOUT_PRESET_VERSION,
          },
          { onConflict: 'user_id' },
        );

      if (error) throw error;

      // Mirror to localStorage
      setDashboardLayoutStateV2(userId, normalizedRole, normalized);

      return normalized;
    },
    onSuccess: (normalized) => {
      queryClient.setQueryData(queryKey(userId), normalized);
    },
    onError: (err) => {
      console.error('[useDashboardLayout] save failed', err);
      toast.error('Failed to save dashboard layout. Please try again.');
    },
  });

  // ── Reset mutation ───────────────────────────────────────────

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Authentication required.');

      const { error } = await supabase
        .from('dashboard_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Clear all localStorage dashboard keys
      resetDashboardWidgetLayoutState(userId, normalizedRole);
      resetDashboardEnabledWidgetIds(userId, normalizedRole);
      resetDashboardWidgetSpanMap(userId, normalizedRole);

      return buildDefaults(normalizedRole);
    },
    onSuccess: (defaults) => {
      queryClient.setQueryData(queryKey(userId), defaults);
      toast.success('Dashboard reset to default layout.');
    },
    onError: (err) => {
      console.error('[useDashboardLayout] reset failed', err);
      toast.error('Failed to reset dashboard layout. Please try again.');
    },
  });

  // ── Public API ───────────────────────────────────────────────

  const saveLayout = useCallback(
    (nextState: DashboardLayoutStateV2) => saveMutation.mutate(nextState),
    [saveMutation],
  );

  const resetLayout = useCallback(
    () => resetMutation.mutate(),
    [resetMutation],
  );

  return {
    ...view,
    isLoading: layoutQuery.isLoading,
    isSaving: saveMutation.isPending,
    isResetting: resetMutation.isPending,
    saveLayout,
    resetLayout,
    role: normalizedRole,
  };
}
