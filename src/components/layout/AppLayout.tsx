import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { Loader2 } from 'lucide-react';
import { NotificationsBell } from './NotificationsBell';
import { InteractionModeProvider } from '@/components/system';
import {
  getFloatingNotificationsVisible,
  FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY,
  UI_PREFERENCES_CHANGED_EVENT,
} from '@/lib/ui-preferences';

export function AppLayout() {
  const { user, isLoading } = useAuth();
  const [showFloatingNotifications, setShowFloatingNotifications] = useState(getFloatingNotificationsVisible);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromStorage = () => setShowFloatingNotifications(getFloatingNotificationsVisible());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === FLOATING_NOTIFICATIONS_VISIBLE_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    window.addEventListener(UI_PREFERENCES_CHANGED_EVENT, syncFromStorage as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(UI_PREFERENCES_CHANGED_EVENT, syncFromStorage as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="relative flex min-h-screen w-full bg-transparent">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <main id="main-content" className="relative flex-1 overflow-auto">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-info/5 blur-3xl" />
        </div>
        {showFloatingNotifications && (
          <div className="pointer-events-none fixed inset-x-0 top-3 z-40 md:top-4">
            <div className="mx-auto w-full max-w-[1680px] px-3 sm:px-5 md:px-6 lg:px-8">
              <div className="flex justify-end">
                <div className="pointer-events-auto overflow-visible rounded-2xl border border-border/70 bg-background/90 p-1 shadow-[0_12px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl">
                  <NotificationsBell floating />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="animate-fadeIn relative p-3 pt-14 sm:p-5 sm:pt-16 md:p-6 md:pt-6 lg:p-7 xl:p-8">
          <div className="mx-auto w-full max-w-[1680px]">
            <InteractionModeProvider resetKeys={[user?.id ?? null]}>
              <Outlet />
            </InteractionModeProvider>
          </div>
        </div>
      </main>
    </div>
  );
}