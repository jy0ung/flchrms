import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { buildAuthRedirectHref } from '@/lib/auth-redirect';
import { InteractionModeProvider, RouteLoadingState } from '@/components/system';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';

const SIDEBAR_COLLAPSED_KEY = 'hrms.ui.sidebarCollapsed';

export function AppLayout() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  if (isLoading) {
    return (
      <RouteLoadingState
        fullScreen
        title="Loading workspace"
        description="Checking your session and preparing the application shell."
      />
    );
  }

  if (!user) {
    return (
      <Navigate
        to={buildAuthRedirectHref(location)}
        replace
        state={{ from: location }}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen w-full bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main id="main-content" className="flex-1 overflow-auto">
          <div key={location.pathname} className={cn("animate-fadeIn p-4 md:p-6 lg:p-8", isMobile && "pb-20")}> 
            <InteractionModeProvider resetKeys={[user?.id ?? null]}>
              <Outlet />
            </InteractionModeProvider>
          </div>
        </main>
      </div>
      {isMobile && (
        <MobileBottomNav onOpenSidebar={() => setMobileSidebarOpen(true)} />
      )}
    </div>
  );
}
