import type { ReactNode } from 'react';
import { ShieldAlert, Wrench } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useTenantSettingsContext } from '@/contexts/TenantSettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RouteLoadingState } from '@/components/system';

const ADMIN_BYPASS_ROLE = 'admin';

export function TenantMaintenanceGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, role, isLoading: authLoading, signOut } = useAuth();
  const { settings, isLoading: settingsLoading } = useTenantSettingsContext();

  const onAuthRoute = location.pathname === '/auth';
  const canBypassMaintenance = role === ADMIN_BYPASS_ROLE;

  if (settingsLoading && !onAuthRoute) {
    return (
      <RouteLoadingState
        fullScreen
        title="Loading tenant settings"
        description="Checking maintenance controls and platform access rules."
      />
    );
  }

  if (!settings.maintenanceMode) {
    return <>{children}</>;
  }

  if (authLoading && user) {
    return (
      <RouteLoadingState
        fullScreen
        title="Checking maintenance access"
        description="Confirming whether your account can continue during the current maintenance window."
      />
    );
  }

  if (canBypassMaintenance || onAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.06),_transparent_35%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.25))] px-4 py-10">
      <Card className="w-full max-w-xl rounded-[2rem] border-border/70 shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">System maintenance in progress</CardTitle>
            <CardDescription className="text-sm">
              Access is temporarily limited while administrators complete tenant-wide maintenance.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Admin-only access</p>
                <p>
                  Non-admin accounts are paused until maintenance mode is turned off. If you need immediate
                  help, contact your system administrator.
                </p>
              </div>
            </div>
          </div>

          {user ? (
            <Button className="w-full rounded-2xl" variant="outline" onClick={() => void signOut()}>
              Sign Out
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
