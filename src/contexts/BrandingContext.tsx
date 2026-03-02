import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useBranding, type TenantBranding } from '@/hooks/useBranding';

interface BrandingContextValue {
  branding: TenantBranding;
  isLoading: boolean;
}

const DEFAULTS: TenantBranding = {
  id: '',
  company_name: 'FL Group',
  company_tagline: 'HR Management System',
  logo_url: null,
  favicon_url: null,
  login_background_url: null,
  primary_color: '221 83% 53%',
  accent_color: '142 71% 45%',
  sidebar_color: '0 0% 3%',
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULTS,
  isLoading: true,
});

/**
 * Injects tenant branding CSS custom properties into :root and updates
 * document.title and favicon dynamically.
 *
 * Place this provider at the top of the component tree, above ThemeProvider.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data: branding, isLoading } = useBranding();
  const resolved = branding ?? DEFAULTS;

  // Inject CSS custom properties into :root
  useEffect(() => {
    const root = document.documentElement;

    // Primary color — drives accent, ring, chart-1, sidebar-primary, etc.
    root.style.setProperty('--primary', resolved.primary_color);
    root.style.setProperty('--ring', resolved.primary_color);
    root.style.setProperty('--info', resolved.primary_color);
    root.style.setProperty('--chart-1', resolved.primary_color);
    root.style.setProperty('--sidebar-primary', resolved.primary_color);
    root.style.setProperty('--sidebar-ring', resolved.primary_color);

    // Accent / success color
    root.style.setProperty('--success', resolved.accent_color);
    root.style.setProperty('--chart-2', resolved.accent_color);

    // Sidebar color
    root.style.setProperty('--sidebar-background', resolved.sidebar_color);

    return () => {
      // No cleanup needed — the vars remain on :root
    };
  }, [resolved.primary_color, resolved.accent_color, resolved.sidebar_color]);

  // Update document title
  useEffect(() => {
    document.title = `${resolved.company_name} — ${resolved.company_tagline || 'HRMS'}`;
  }, [resolved.company_name, resolved.company_tagline]);

  // Update favicon if custom one is set
  useEffect(() => {
    const existingLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    const defaultHref = existingLink?.href ?? '/favicon.ico';

    if (!resolved.favicon_url) {
      // Restore default favicon if custom was removed
      if (existingLink) existingLink.href = defaultHref;
      return;
    }

    const link = existingLink ?? document.createElement('link');
    link.rel = 'icon';
    link.href = resolved.favicon_url;
    if (!existingLink) document.head.appendChild(link);

    return () => {
      link.href = defaultHref;
    };
  }, [resolved.favicon_url]);

  return (
    <BrandingContext.Provider value={{ branding: resolved, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBrandingContext() {
  return useContext(BrandingContext);
}
