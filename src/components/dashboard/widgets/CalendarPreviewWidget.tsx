/**
 * CalendarPreviewWidget — Shows today's and upcoming calendar events (leaves, holidays, dept events).
 */
import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, isAfter, startOfDay } from 'date-fns';
import { CalendarDays } from 'lucide-react';

import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/system';
import { cn } from '@/lib/utils';

import { DashboardWidgetCard } from './shared';

const EVENT_TYPE_STYLES: Record<CalendarEvent['type'], { badge: string; bg: string }> = {
  leave: { badge: 'warning', bg: 'border-warning/20 bg-warning/5' },
  holiday: { badge: 'info', bg: 'border-primary/20 bg-primary/5' },
  event: { badge: 'success', bg: 'border-success/20 bg-success/5' },
};

function CalendarPreviewWidgetInner() {
  const navigate = useNavigate();
  const today = new Date();
  const { data: events, isLoading } = useCalendarEvents(today);

  const { todayEvents, upcomingEvents } = useMemo(() => {
    if (!events) return { todayEvents: [], upcomingEvents: [] };
    const now = startOfDay(today);

    const todayList = events.filter((e) => isSameDay(e.date, now));
    const upcoming = events
      .filter((e) => isAfter(e.date, now))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    return { todayEvents: todayList.slice(0, 5), upcomingEvents: upcoming };
  }, [events]);

  return (
    <DashboardWidgetCard
      title="Calendar"
      description={`${format(today, 'MMMM yyyy')} — today and upcoming events.`}
      icon={CalendarDays}
      action={
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/calendar')}>
          Full Calendar
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : todayEvents.length === 0 && upcomingEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-5 text-center text-sm text-muted-foreground">
          No events this month — your schedule is clear.
        </div>
      ) : (
        <div className="space-y-4">
          {todayEvents.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
              <div className="space-y-2">
                {todayEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {upcomingEvents.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</p>
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <CalendarEventRow key={event.id} event={event} showDate />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function CalendarEventRow({ event, showDate = false }: { event: CalendarEvent; showDate?: boolean }) {
  const style = EVENT_TYPE_STYLES[event.type];

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-3', style.bg)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {showDate && format(event.date, 'MMM d')}
          {showDate && event.endDate && ` – ${format(event.endDate, 'MMM d')}`}
          {!showDate && event.endDate && !isSameDay(event.date, event.endDate) && `Until ${format(event.endDate, 'MMM d')}`}
          {event.description && ` · ${event.description}`}
        </p>
      </div>
      <StatusBadge
        status={event.type === 'leave' ? 'warning' : event.type === 'holiday' ? 'info' : 'success'}
        labelOverride={event.type === 'leave' ? 'Leave' : event.type === 'holiday' ? 'Holiday' : 'Event'}
        size="sm"
      />
    </div>
  );
}

export const CalendarPreviewWidget = memo(CalendarPreviewWidgetInner);
