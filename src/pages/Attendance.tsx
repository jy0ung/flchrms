import { useAttendanceHistory, useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { AppPageContainer, DataTableShell, PageHeader, StatusBadge } from '@/components/system';

export default function Attendance() {
  const { data: history, isLoading } = useAttendanceHistory();
  const { data: today } = useTodayAttendance();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  return (
    <AppPageContainer>
      <PageHeader
        shellDensity="compact"
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
      />

      {today && (
        <Card className="card-stat bg-accent/5 border-accent/20 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Status</p>
                <p className="text-2xl font-bold mt-1">{format(new Date(), 'EEEE, MMM d')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  In: {today.clock_in ? format(new Date(today.clock_in), 'h:mm a') : '-'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Out: {today.clock_out ? format(new Date(today.clock_out), 'h:mm a') : '-'}
                </p>
                <StatusBadge status={today.status} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTableShell
        title="Attendance History"
        loading={isLoading}
        hasData={Boolean(history?.length)}
        emptyState={<div className="p-8 text-center text-muted-foreground">No attendance records</div>}
        mobileList={
          <div className="space-y-3 p-4 md:hidden">
            {history?.map((record) => (
              <div key={record.id} className="rounded-xl border border-border/60 p-4 shadow-sm">
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
    </AppPageContainer>
  );
}
