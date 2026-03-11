import { Fragment, type MouseEvent } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminCapabilities } from '@/lib/admin-permissions';
import { buildAuthRedirectHref } from '@/lib/auth-redirect';
import { InteractionModeProvider, RouteLoadingState } from '@/components/system';
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
import { getRouteLabel } from '@/lib/navigation-labels';
import { AppPageContainer } from '@/components/system';

export function AdminLayout() {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();
  const { capabilityMap, isLoading: capabilityLoading } = useMyAdminCapabilities(role);
  const capabilities = getAdminCapabilities(role, capabilityMap);

  if (isLoading || capabilityLoading) {
    return (
      <RouteLoadingState
        fullScreen
        title="Loading governance workspace"
        description="Checking your admin capabilities and preparing the governance shell."
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

  if (!capabilities.canAccessAdminPage) {
    return <Navigate to="/dashboard" replace />;
  }

  const pathSegments = location.pathname.split('/').filter(Boolean);

  const focusMainContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById('admin-main-content');
    if (!(target instanceof HTMLElement)) return;

    window.history.replaceState(null, '', '#admin-main-content');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  };

  return (
    <SidebarProvider>
      <a
        href="#admin-main-content"
        onClick={focusMainContent}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to governance content
      </a>
      <AdminSidebar capabilityMap={capabilityMap} />
      <SidebarInset>
        {/* Admin Top Bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background">
          <AppPageContainer
            spacing="none"
            maxWidth="7xl"
            framePadding="shell"
            className="flex h-16 min-w-0 items-center gap-3 md:h-14"
          >
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-5" />

            {/* Breadcrumbs */}
            <div className="min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  {pathSegments.map((segment, index) => {
                    const path = '/' + pathSegments.slice(0, index + 1).join('/');
                    const label = getRouteLabel(segment);
                    const isLast = index === pathSegments.length - 1;
                    return (
                      <Fragment key={path}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild><Link to={path}>{label}</Link></BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
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
          </AppPageContainer>
        </header>

        {/* Page Content */}
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto focus:outline-none"
        >
          <AppPageContainer
            key={location.pathname}
            spacing="none"
            maxWidth="none"
            framePadding="page"
            className="animate-fadeIn py-4 md:py-6 lg:py-8"
          >
            <div className="mx-auto w-full max-w-7xl">
              <InteractionModeProvider resetKeys={[user?.id ?? null]}>
                <Outlet />
              </InteractionModeProvider>
            </div>
          </AppPageContainer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
