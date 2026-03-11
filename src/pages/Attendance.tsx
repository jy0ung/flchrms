import { useAttendanceHistory, useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Calendar, Clock3, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { DataTableShell, QueryErrorState, StatusBadge } from '@/components/system';
import { SummaryRail } from '@/components/workspace/SummaryRail';
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

  return (
    <UtilityLayout
      title="Attendance"
      description="Track your work hours"
      actions={
        !today
          ? [
              {
                id: 'clock-in',
                label: 'Clock In',
                icon: Play,
                onClick: () => clockIn.mutate(),
                disabled: clockIn.isPending,
                variant: 'default',
              },
            ]
          : !today.clock_out
            ? [
                {
                  id: 'clock-out',
                  label: 'Clock Out',
                  icon: Square,
                  onClick: () => clockOut.mutate(),
                  disabled: clockOut.isPending,
                  variant: 'destructive',
                },
            ]
            : []
      }
      summarySlot={
        <SummaryRail
          compactBreakpoint="xl"
          items={[
            {
              id: 'today-status',
              label: 'Today Status',
              value: todayStatus,
              helper: format(new Date(), 'EEEE, MMM d'),
              icon: Calendar,
              tone: today ? 'success' : 'default',
            },
            {
              id: 'clock-in',
              label: 'Clock In',
              value: clockInLabel,
              helper: today?.clock_in ? 'Current work session started.' : 'No clock-in recorded yet.',
              icon: Play,
              tone: today?.clock_in ? 'info' : 'default',
            },
            {
              id: 'clock-out',
              label: 'Clock Out',
              value: clockOutLabel,
              helper: today?.clock_out ? 'Work session completed.' : 'Clock-out pending.',
              icon: Square,
              tone: today?.clock_out ? 'success' : 'warning',
            },
            {
              id: 'history-count',
              label: 'History Records',
              value: attendanceHistoryCount,
              helper: 'Tracked attendance entries on file.',
              icon: Clock3,
            },
          ]}
        />
      }
    >
      {isError && (
        <QueryErrorState label="attendance records" onRetry={() => refetch()} />
      )}

      <DataTableShell
        title="Attendance History"
        description="Clock-in and clock-out history for your recent workdays."
        loading={isLoading}
        hasData={Boolean(history?.length)}
        emptyState={
          <WorkspaceStatePanel
            title="No attendance records yet"
            description="Your work sessions will appear here once attendance has been tracked."
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
