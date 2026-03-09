/**
 * Enterprise-grade dashboard hero greeting.
 * Clean, professional header with contextual action indicators.
 */
import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { Bell, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useUserNotifications } from '@/hooks/useNotifications';
import type { AppRole } from '@/types/hrms';
import { formatRoleLabel, getScopeLabel } from './dashboard-config';
import { cn } from '@/lib/utils';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good evening';
}

function DashboardGreetingInner({ role }: { role: AppRole }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUserNotifications(5);

  const greeting = useMemo(getTimeGreeting, []);
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const actionChips = useMemo(() => {
    const chips: Array<{ icon: typeof Bell; label: string; tone: string; route: string; count: number }> = [];

    if (unreadCount > 0) {
      chips.push({
        icon: Bell,
        label: `${unreadCount} notification${unreadCount > 1 ? 's' : ''}`,
        tone: 'primary',
        route: '/notifications',
        count: unreadCount,
      });
    }

    return chips;
  }, [unreadCount]);

  const toneMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15',
    warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15',
    info: 'bg-info/10 text-info border-info/20 hover:bg-info/15',
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-primary/[0.03] p-5 sm:p-6">
      {/* Subtle decorative element */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.04] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/[0.03] blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {today}
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-[1.75rem]">
            {greeting}, {profile?.first_name || 'there'}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary">
              {formatRoleLabel(role)}
            </span>
            <span className="text-border">•</span>
            <span className="text-xs">{getScopeLabel(role, null)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actionChips.length > 0 ? (
            actionChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => navigate(chip.route)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                  toneMap[chip.tone],
                )}
              >
                <chip.icon className="h-3.5 w-3.5" />
                <span>{chip.label}</span>
                <ChevronRight className="h-3 w-3 opacity-50" />
              </button>
            ))
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-success/20 bg-success/8 px-3 py-2 text-xs font-medium text-success">
              <Sparkles className="h-3.5 w-3.5" />
              All caught up
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const DashboardGreeting = memo(DashboardGreetingInner);
