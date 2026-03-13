import { Bell, CalendarDays, Clock3, Sparkles, UserRound, Wallet } from 'lucide-react';

import { ActionTile } from '@/components/system';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import { DashboardSection } from './DashboardSection';

const STARTER_TASKS = [
  {
    title: 'Clock In or Review Attendance',
    description: 'Start your workday, confirm your time records, and make attendance the first live signal on this dashboard.',
    to: '/attendance',
    icon: Clock3,
    badgeLabel: 'Today',
    iconSurfaceClassName: 'bg-success/10',
    iconClassName: 'text-success',
  },
  {
    title: 'Request Leave',
    description: 'Plan upcoming time away and start building leave history, balances, and approval updates in one place.',
    to: '/leave',
    icon: CalendarDays,
    badgeLabel: 'Plan ahead',
    iconSurfaceClassName: 'bg-warning/10',
    iconClassName: 'text-warning',
  },
  {
    title: 'Complete Profile',
    description: 'Keep your personal details, emergency contact, and notification preferences current before you need them.',
    to: '/profile',
    icon: UserRound,
    badgeLabel: 'Recommended',
    iconSurfaceClassName: 'bg-primary/10',
    iconClassName: 'text-primary',
  },
  {
    title: 'View Payroll',
    description: 'Review your payslips and salary records so payroll becomes a familiar reference point instead of a later surprise.',
    to: '/payroll',
    icon: Wallet,
    badgeLabel: 'Reference',
    iconSurfaceClassName: 'bg-info/10',
    iconClassName: 'text-info',
  },
];

const DASHBOARD_PREVIEW_AREAS = [
  {
    title: 'Daily status',
    description: 'Today’s attendance, leave balance, and current work status will replace starter reminders once activity appears.',
    icon: Clock3,
  },
  {
    title: 'Updates and alerts',
    description: 'Unread notifications, announcements, and recent workflow activity will move to the front when they matter.',
    icon: Bell,
  },
  {
    title: 'Records and growth',
    description: 'Payroll, training, reviews, and schedule context will surface as those workspaces become active.',
    icon: Sparkles,
  },
];

export function DashboardGettingStarted() {
  return (
    <div className="space-y-6 md:space-y-7">
      <DashboardSection
        title="Start Here"
        description="Complete the key setup tasks first so your dashboard can switch from reminders to live work signals."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STARTER_TASKS.map((task) => (
            <ActionTile
              key={task.title}
              title={task.title}
              description={task.description}
              icon={task.icon}
              to={task.to}
              badgeLabel={task.badgeLabel}
              iconSurfaceClassName={task.iconSurfaceClassName}
              iconClassName={task.iconClassName}
            />
          ))}
        </div>
      </DashboardSection>

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.12em]">
              Progressive reveal
            </Badge>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                This dashboard will expand as your workspace becomes active
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Once you start tracking time, requesting leave, and reviewing your records, the dashboard will replace these starter actions with live attendance status, balances, notifications, payroll references, and learning updates.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {DASHBOARD_PREVIEW_AREAS.map((area) => (
              <div
                key={area.title}
                className="rounded-xl border border-border/80 bg-background/90 p-4 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <area.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">{area.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
