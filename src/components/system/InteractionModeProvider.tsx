import * as React from "react";
import { useLocation } from "react-router-dom";

import {
  DEFAULT_INTERACTION_MODE,
  INTERACTION_MODE_LABELS,
  type InteractionMode,
  isInteractionMode,
  normalizeInteractionModes,
} from "@/components/system/interaction-mode";

export interface InteractionModeContextValue {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  resetMode: () => void;
  is: (mode: InteractionMode) => boolean;
  allowedModes: readonly InteractionMode[];
  defaultMode: InteractionMode;
  routeScope: string;
}

const InteractionModeContext = React.createContext<InteractionModeContextValue | null>(null);

export interface InteractionModeProviderProps {
  children: React.ReactNode;
  defaultMode?: InteractionMode;
  allowedModes?: readonly InteractionMode[];
  resetOnRouteChange?: boolean;
  resetOnEscape?: boolean;
  resetKeys?: readonly (string | number | boolean | null | undefined)[];
  persistKey?: string;
}

function readPersistedMode(storageKey: string, allowedModes: readonly InteractionMode[]): InteractionMode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored || !isInteractionMode(stored)) return null;
  return allowedModes.includes(stored) ? stored : null;
}

function writePersistedMode(storageKey: string, mode: InteractionMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, mode);
}

function resolveDefaultMode(
  candidate: InteractionMode | undefined,
  allowedModes: readonly InteractionMode[],
): InteractionMode {
  if (candidate && allowedModes.includes(candidate)) return candidate;
  if (allowedModes.includes(DEFAULT_INTERACTION_MODE)) return DEFAULT_INTERACTION_MODE;
  return allowedModes[0] ?? DEFAULT_INTERACTION_MODE;
}

function sanitizeMode(
  candidate: InteractionMode,
  allowedModes: readonly InteractionMode[],
  fallbackMode: InteractionMode,
): InteractionMode {
  return allowedModes.includes(candidate) ? candidate : fallbackMode;
}

function isElementInDialog(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[role="dialog"]'));
}

/**
 * Route-scoped interaction mode controller.
 * Resets mode on route changes by default to prevent cross-page mode bleed.
 */
export function InteractionModeProvider({
  children,
  defaultMode,
  allowedModes,
  resetOnRouteChange = true,
  resetOnEscape = true,
  resetKeys,
  persistKey,
}: InteractionModeProviderProps) {
  const location = useLocation();
  const normalizedAllowedModes = React.useMemo(
    () => normalizeInteractionModes(allowedModes),
    [allowedModes],
  );
  const resolvedDefaultMode = React.useMemo(
    () => resolveDefaultMode(defaultMode, normalizedAllowedModes),
    [defaultMode, normalizedAllowedModes],
  );
  const storageKey = persistKey ? `hrms.ui.interactionMode.${persistKey}` : null;
  const resetSignature = React.useMemo(() => JSON.stringify(resetKeys ?? []), [resetKeys]);
  const lastPathnameRef = React.useRef(location.pathname);
  const lastResetSignatureRef = React.useRef(resetSignature);

  const [mode, setModeState] = React.useState<InteractionMode>(() => {
    if (storageKey) {
      const persisted = readPersistedMode(storageKey, normalizedAllowedModes);
      if (persisted) return persisted;
    }
    return resolvedDefaultMode;
  });

  React.useEffect(() => {
    setModeState((currentMode) =>
      sanitizeMode(currentMode, normalizedAllowedModes, resolvedDefaultMode),
    );
  }, [normalizedAllowedModes, resolvedDefaultMode]);

  React.useEffect(() => {
    if (!storageKey) return;
    writePersistedMode(storageKey, mode);
  }, [mode, storageKey]);

  React.useEffect(() => {
    if (!resetOnRouteChange) {
      lastPathnameRef.current = location.pathname;
      return;
    }
    if (lastPathnameRef.current !== location.pathname) {
      setModeState(resolvedDefaultMode);
    }
    lastPathnameRef.current = location.pathname;
  }, [location.pathname, resetOnRouteChange, resolvedDefaultMode]);

  React.useEffect(() => {
    if (lastResetSignatureRef.current !== resetSignature) {
      setModeState(resolvedDefaultMode);
    }
    lastResetSignatureRef.current = resetSignature;
  }, [resetSignature, resolvedDefaultMode]);

  React.useEffect(() => {
    if (!resetOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (isElementInDialog(event.target)) return;

      setModeState((currentMode) => {
        if (currentMode === resolvedDefaultMode) return currentMode;
        return resolvedDefaultMode;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetOnEscape, resolvedDefaultMode]);

  const setMode = React.useCallback(
    (nextMode: InteractionMode) => {
      setModeState((currentMode) => {
        if (!normalizedAllowedModes.includes(nextMode)) return currentMode;
        return nextMode;
      });
    },
    [normalizedAllowedModes],
  );

  const resetMode = React.useCallback(() => {
    setModeState(resolvedDefaultMode);
  }, [resolvedDefaultMode]);

  const is = React.useCallback(
    (candidate: InteractionMode) => mode === candidate,
    [mode],
  );

  const value = React.useMemo<InteractionModeContextValue>(
    () => ({
      mode,
      setMode,
      resetMode,
      is,
      allowedModes: normalizedAllowedModes,
      defaultMode: resolvedDefaultMode,
      routeScope: location.pathname,
    }),
    [is, location.pathname, mode, normalizedAllowedModes, resetMode, resolvedDefaultMode, setMode],
  );

  return <InteractionModeContext.Provider value={value}>{children}</InteractionModeContext.Provider>;
}

export function useInteractionMode(): InteractionModeContextValue {
  const context = React.useContext(InteractionModeContext);
  if (!context) {
    throw new Error("useInteractionMode must be used within InteractionModeProvider.");
  }
  return context;
}

export function getInteractionModeLabel(mode: InteractionMode): string {
  return INTERACTION_MODE_LABELS[mode];
}

