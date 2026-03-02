import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import {
  getLeaveDisplayPrefs,
  setLeaveDisplayPrefs,
  resetLeaveDisplayPrefs,
  UI_PREFERENCES_CHANGED_EVENT,
  type LeaveDisplayPrefs,
} from '@/lib/ui-preferences';

export type { LeaveDisplayPrefs };

// ── External-store plumbing for localStorage reactivity ──────────
let version = 0;

function subscribe(onStoreChange: () => void) {
  const handler = () => {
    version += 1;
    onStoreChange();
  };
  window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

function getSnapshot() {
  return version;
}

function getServerSnapshot() {
  return 0;
}

/**
 * Per-user leave-display preferences backed by localStorage.
 *
 * Returns the visible / hidden split of the provided `balances` array
 * plus helpers to update or reset the preferences.
 */
export function useLeaveDisplayPrefs(
  userId: string | undefined,
  role: string | undefined,
  balances: LeaveBalance[],
) {
  // Re-render when localStorage changes
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const allIds = useMemo(() => balances.map((b) => b.leave_type_id), [balances]);

  const prefs = useMemo(() => {
    if (!userId || !role) return { visibleIds: allIds } satisfies LeaveDisplayPrefs;
    return getLeaveDisplayPrefs(userId, role, allIds);
  }, [userId, role, allIds]);

  const visibleSet = useMemo(() => new Set(prefs.visibleIds), [prefs.visibleIds]);

  const visibleBalances = useMemo(
    () => {
      // Maintain the order defined in visibleIds
      const byId = new Map(balances.map((b) => [b.leave_type_id, b]));
      return prefs.visibleIds
        .map((id: string) => byId.get(id))
        .filter((b): b is LeaveBalance => b !== undefined);
    },
    [balances, prefs.visibleIds],
  );

  const hiddenBalances = useMemo(
    () => balances.filter((b) => !visibleSet.has(b.leave_type_id)),
    [balances, visibleSet],
  );

  const updatePrefs = useCallback(
    (next: LeaveDisplayPrefs) => {
      if (!userId || !role) return;
      setLeaveDisplayPrefs(userId, role, next);
    },
    [userId, role],
  );

  const resetPrefsToDefault = useCallback(() => {
    if (!userId || !role) return;
    resetLeaveDisplayPrefs(userId, role);
  }, [userId, role]);

  return {
    prefs,
    visibleBalances,
    hiddenBalances,
    updatePrefs,
    resetPrefs: resetPrefsToDefault,
  } as const;
}
