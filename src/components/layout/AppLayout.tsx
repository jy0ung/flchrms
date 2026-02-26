import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { Loader2 } from 'lucide-react';
import { NotificationsBell } from './NotificationsBell';
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
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto relative">
        {showFloatingNotifications && (
          <div className="fixed top-3 right-3 z-40 md:top-4 md:right-6 lg:right-8 overflow-visible">
            <div className="rounded-xl border border-border/60 bg-background/95 p-1 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80 overflow-visible">
              <NotificationsBell floating />
            </div>
          </div>
        )}
        <div className="animate-fadeIn p-4 pt-16 sm:p-5 sm:pt-16 md:p-6 md:pt-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
