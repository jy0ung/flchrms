import { useAttendanceHistory, useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Clock3, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ContextChip, DataTableShell, QueryErrorState, StatusBadge, SurfaceSection } from '@/components/system';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { UtilityLayout } from '@/layouts/UtilityLayout';

export default function Attendance() {
  usePageTitle('Attendance');
  const { data: history, isLoading, isError, refetch } = useAttendanceHistory();
  const { data: today } = useTodayAttendance();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const attendanceHistoryCount = history?.length ?? 0;
  const todayStatus = today?.status ? today.status.replace(/_/g, ' ') : 'Not started';
  const clockInLabel = today?.clock_in ? format(new Date(today.clock_in), 'h:mm a') : '—';
  const clockOutLabel = today?.clock_out ? format(new Date(today.clock_out), 'h:mm a') : '—';
  const todayAction = !today
    ? {
        label: 'Clock In',
        icon: Play,
        onClick: () => clockIn.mutate(),
        disabled: clockIn.isPending,
        variant: 'default' as const,
      }
    : !today.clock_out
      ? {
          label: 'Clock Out',
          icon: Square,
          onClick: () => clockOut.mutate(),
          disabled: clockOut.isPending,
          variant: 'destructive' as const,
        }
      : null;
  const todayHeadline = !today
    ? 'You have not started today’s attendance yet.'
    : !today.clock_out
      ? `You are clocked in${today.clock_in ? ` since ${clockInLabel}` : ' for today'}.`
      : `Today’s attendance is complete${today.clock_out ? ` with clock-out at ${clockOutLabel}` : '.'}`;
  const todayDescription = !today
    ? 'Start your workday from this card. Recent sessions stay below for reference once you begin tracking time.'
    : !today.clock_out
      ? 'Your work session is active. Clock out here when you finish for the day.'
      : 'Today is already recorded. Review recent sessions below if you need to confirm your latest workday.';
  const todayPanel = (
    <SurfaceSection
      title="Today’s attendance"
      description={todayDescription}
      actions={todayAction ? (
        <Button
          type="button"
          className="h-9 rounded-full"
          variant={todayAction.variant}
          onClick={todayAction.onClick}
          disabled={todayAction.disabled}
        >
          <todayAction.icon className="mr-2 h-4 w-4" />
          {todayAction.label}
        </Button>
      ) : null}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {today ? (
            <StatusBadge status={today.status} labelOverride={todayStatus} />
          ) : (
            <ContextChip className="rounded-full">No session started</ContextChip>
          )}
          <ContextChip className="rounded-full">
            {todayHeadline}
          </ContextChip>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/25 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Status
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{todayStatus}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {today ? 'Your current attendance state for today.' : 'Clock in when you start work.'}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/25 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Clock In
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{clockInLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {today?.clock_in ? 'Current work session started.' : 'No clock-in recorded yet.'}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/25 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Clock Out
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{clockOutLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {today?.clock_out ? 'Work session completed.' : 'Clock-out pending.'}
            </p>
          </div>
        </div>
      </div>
    </SurfaceSection>
  );

  return (
    <UtilityLayout
      archetype="task-dashboard"
      eyebrow="Workspace"
      title="Attendance"
      description="Start or finish today’s work session, then reference your recent attendance history."
      metaSlot={(
        <div className="flex flex-wrap gap-2">
          <ContextChip className="rounded-full">
            {format(new Date(), 'EEEE, MMM d')}
          </ContextChip>
        </div>
      )}
      leadSlot={todayPanel}
      leadSurface="none"
    >
      {isError && (
        <QueryErrorState label="attendance records" onRetry={() => refetch()} />
      )}

      <DataTableShell
        title="Recent attendance history"
        description="Your most recent clock-in and clock-out records."
        headerActions={<ContextChip className="rounded-full">{attendanceHistoryCount} on file</ContextChip>}
        loading={isLoading}
        hasData={Boolean(history?.length)}
        emptyState={
          <WorkspaceStatePanel
            title="No attendance history yet"
            description="Your work sessions will appear here after you start tracking time from today’s attendance card."
            icon={Clock3}
          />
        }
        mobileList={
          <div className="space-y-3 p-4 md:hidden">
            {history?.map((record) => (
              <div key={record.id} className="rounded-lg border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{format(new Date(record.date), 'EEE, MMM d, yyyy')}</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>Clock In: {record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '-'}</p>
                      <p>Clock Out: {record.clock_out ? format(new Date(record.clock_out), 'h:mm a') : '-'}</p>
                    </div>
                  </div>
                  <StatusBadge status={record.status} />
                </div>
              </div>
            ))}
          </div>
        }
        table={
          <div className="overflow-x-auto rounded-b-xl">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Clock In</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Clock Out</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {history?.map((record) => (
                  <tr key={record.id} className="border-t border-border table-row-hover">
                    <td className="p-4 font-medium">{format(new Date(record.date), 'EEE, MMM d, yyyy')}</td>
                    <td className="p-4">{record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '-'}</td>
                    <td className="p-4">{record.clock_out ? format(new Date(record.clock_out), 'h:mm a') : '-'}</td>
                    <td className="p-4">
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />
    </UtilityLayout>
  );
}
