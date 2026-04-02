import { createContext, useContext, type ReactNode } from 'react';

import {
  TENANT_SETTINGS_DEFAULTS,
  useTenantSettings,
  type TenantSettings,
} from '@/hooks/useTenantSettings';

interface TenantSettingsContextValue {
  settings: TenantSettings;
  isLoading: boolean;
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  settings: TENANT_SETTINGS_DEFAULTS,
  isLoading: true,
});

export function TenantSettingsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useTenantSettings();

  return (
    <TenantSettingsContext.Provider
      value={{
        settings: data ?? TENANT_SETTINGS_DEFAULTS,
        isLoading,
      }}
    >
      {children}
    </TenantSettingsContext.Provider>
  );
}

export function useTenantSettingsContext() {
  return useContext(TenantSettingsContext);
}
