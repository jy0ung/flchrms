import { useMemo } from 'react';
import { format } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';

import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/hrms';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { DashboardWidgetId } from '@/lib/dashboard-layout';
import {
  formatRoleLabel,
  getScopeLabel,
  ROLE_DEFAULT_WIDGETS,
  ROLE_DEFAULT_WIDGET_WIDTHS,
} from '@/components/dashboard/dashboard-config';

import { AppPageContainer } from '@/components/system';
import { DashboardWidgetRenderer } from '@/components/dashboard/widgets';
import { QuickStats } from '@/components/dashboard/QuickStats';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { profile, role } = useAuth();

  const normalizedRole: AppRole = role ?? 'employee';
  const showManagerWidgets = canViewManagerDashboardWidgets(normalizedRole);
  const widgetIds = ROLE_DEFAULT_WIDGETS[normalizedRole];
  const widgetWidths = ROLE_DEFAULT_WIDGET_WIDTHS[normalizedRole];

  const widgetGrid = useMemo(() => {
    return widgetIds.map((id) => {
      const w = widgetWidths[id] ?? 4;
      // Map 12-col grid widths to responsive classes
      const colSpan = w >= 12 ? 'lg:col-span-2' : '';
      return { id, colSpan };
    });
  }, [widgetIds, widgetWidths]);

  return (
    <AppPageContainer spacing="comfortable">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile?.first_name || 'there'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} &middot;{' '}
          {formatRoleLabel(normalizedRole)} &middot;{' '}
          {getScopeLabel(normalizedRole, null)}
        </p>
      </div>

      {/* Quick Stats — managers and above */}
      {showManagerWidgets && <QuickStats />}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {widgetGrid.map(({ id, colSpan }) => (
          <div key={id} className={colSpan}>
            <DashboardWidgetRenderer
              widgetId={id as DashboardWidgetId}
              role={normalizedRole}
            />
          </div>
        ))}
      </div>
    </AppPageContainer>
  );
}
