/**
 * Time-aware greeting with action summary line.
 * Replaces the inline greeting in Dashboard.tsx.
 */
import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { Bell, CalendarClock, CheckCircle2, Sparkles } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useUserNotifications } from '@/hooks/useNotifications';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import type { AppRole } from '@/types/hrms';
import { formatRoleLabel, getScopeLabel } from './dashboard-config';

function getTimeGreeting(): { greeting: string; emoji: string; message: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { greeting: 'Good night', emoji: '🌙', message: 'Burning the midnight oil — stay sharp.' };
  if (hour < 12) return { greeting: 'Good morning', emoji: '☀️', message: 'Start the day with focus and energy.' };
  if (hour < 17) return { greeting: 'Good afternoon', emoji: '🌤️', message: 'Stay productive — you are doing great.' };
  if (hour < 21) return { greeting: 'Good evening', emoji: '🌆', message: 'Wrapping up? Review your progress today.' };
  return { greeting: 'Good night', emoji: '🌙', message: 'Rest well — tomorrow is another day.' };
}

function DashboardGreetingInner({ role }: { role: AppRole }) {
  const { profile } = useAuth();
  const { unreadCount } = useUserNotifications(5);
  const showManagerActions = canViewManagerDashboardWidgets(role);
  const { data: stats } = useExecutiveStats();

  const { greeting, emoji, message } = useMemo(getTimeGreeting, []);
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Build action summary chips
  const actionChips = useMemo(() => {
    const chips: Array<{ icon: typeof Bell; label: string; tone: string }> = [];

    if (unreadCount > 0) {
      chips.push({
        icon: Bell,
        label: `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`,
        tone: 'text-primary',
      });
    }

    if (showManagerActions && stats) {
      if (stats.pendingLeaveRequests > 0) {
        chips.push({
          icon: CalendarClock,
          label: `${stats.pendingLeaveRequests} pending leave${stats.pendingLeaveRequests > 1 ? 's' : ''}`,
          tone: 'text-warning',
        });
      }
      if (stats.pendingReviews > 0) {
        chips.push({
          icon: CheckCircle2,
          label: `${stats.pendingReviews} pending review${stats.pendingReviews > 1 ? 's' : ''}`,
          tone: 'text-info',
        });
      }
    }

    return chips;
  }, [unreadCount, showManagerActions, stats]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="mr-2">{emoji}</span>
            {greeting}, {profile?.first_name || 'there'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {today} · {formatRoleLabel(role)} · {getScopeLabel(role, null)}
          </p>
          <p className="text-sm text-muted-foreground/80 italic">{message}</p>
        </div>

        {actionChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actionChips.map((chip) => (
              <div
                key={chip.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium"
              >
                <chip.icon className={`h-3.5 w-3.5 ${chip.tone}`} />
                <span>{chip.label}</span>
              </div>
            ))}
          </div>
        )}

        {actionChips.length === 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/5 px-3 py-1.5 text-xs font-medium text-success">
            <Sparkles className="h-3.5 w-3.5" />
            All clear — no pending actions
          </div>
        )}
      </div>
    </div>
  );
}

export const DashboardGreeting = memo(DashboardGreetingInner);
