import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminCapabilities } from '@/lib/admin-permissions';
import { buildAuthRedirectHref } from '@/lib/auth-redirect';
import { Loader2 } from 'lucide-react';
import { InteractionModeProvider } from '@/components/system';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { useMyAdminCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { ROUTE_LABELS } from '@/lib/navigation-labels';

export function AdminLayout() {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();
  const { capabilityMap, isLoading: capabilityLoading } = useMyAdminCapabilities(role);
  const capabilities = getAdminCapabilities(role, capabilityMap);

  if (isLoading || capabilityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
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

  if (!capabilities.canAccessAdminPage) {
    return <Navigate to="/dashboard" replace />;
  }

  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <SidebarProvider>
      <AdminSidebar capabilityMap={capabilityMap} />
      <SidebarInset>
        {/* Admin Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          
          {/* Breadcrumbs */}
          <div className="flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                {pathSegments.map((segment, index) => {
                  const path = '/' + pathSegments.slice(0, index + 1).join('/');
                  const label = ROUTE_LABELS[segment] || segment;
                  const isLast = index === pathSegments.length - 1;
                  return (
                    <BreadcrumbItem key={path}>
                      {index > 0 && <BreadcrumbSeparator />}
                      {isLast ? (
                        <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild><Link to={path}>{label}</Link></BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div key={location.pathname} className="animate-fadeIn p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <InteractionModeProvider resetKeys={[user?.id ?? null]}>
                <Outlet />
              </InteractionModeProvider>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
