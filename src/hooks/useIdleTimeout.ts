import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS: (keyof DocumentEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
];

/**
 * Signs the user out after a period of inactivity.
 *
 * Default: 30 minutes (1_800_000 ms).
 * Resets on mouse, keyboard, touch, or scroll activity.
 */
export function useIdleTimeout(
  onTimeout: () => void,
  timeoutMs = 30 * 60 * 1000,
  enabled = true,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, timeoutMs);
  }, [onTimeout, timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handler = () => resetTimer();

    for (const event of IDLE_EVENTS) {
      document.addEventListener(event, handler, { passive: true });
    }

    // Also reset on visibility change (tab becomes active again)
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') resetTimer();
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of IDLE_EVENTS) {
        document.removeEventListener(event, handler);
      }
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [enabled, resetTimer]);
}
