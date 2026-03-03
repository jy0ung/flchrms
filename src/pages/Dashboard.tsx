import { useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';

import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/hrms';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { DashboardWidgetId } from '@/lib/dashboard-layout';
import {
  ROLE_DEFAULT_WIDGETS,
  ROLE_DEFAULT_WIDGET_WIDTHS,
} from '@/components/dashboard/dashboard-config';

import { AppPageContainer } from '@/components/system';
import { DashboardWidgetRenderer } from '@/components/dashboard/widgets';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { role } = useAuth();

  const normalizedRole: AppRole = role ?? 'employee';
  const showManagerWidgets = canViewManagerDashboardWidgets(normalizedRole);

  const widgetIds = ROLE_DEFAULT_WIDGETS[normalizedRole];
  const widgetWidths = ROLE_DEFAULT_WIDGET_WIDTHS[normalizedRole];

  const widgetGrid = useMemo(() => {
    return widgetIds.map((id) => {
      const w = widgetWidths[id] ?? 4;
      const colSpan =
        w >= 12
          ? 'md:col-span-2 lg:col-span-3'
          : w >= 8
            ? 'md:col-span-2 lg:col-span-2'
            : '';
      return { id, colSpan };
    });
  }, [widgetIds, widgetWidths]);

  return (
    <AppPageContainer spacing="comfortable">
      {/* Hero Greeting */}
      <DashboardGreeting role={normalizedRole} />

      {/* Quick Stats — managers and above */}
      {showManagerWidgets && <QuickStats />}

      {/* Widget grid — responsive 3-column layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
