import { useCallback, useRef } from 'react';

type FocusableTarget = HTMLElement | null | undefined;

export function useDrawerFocusReturn<T extends HTMLElement = HTMLElement>() {
  const restoreFocusRef = useRef<T | null>(null);

  const rememberTrigger = useCallback((target: FocusableTarget) => {
    restoreFocusRef.current = target instanceof HTMLElement ? (target as T) : null;
  }, []);

  return {
    rememberTrigger,
    restoreFocusElement: restoreFocusRef.current,
  };
}
