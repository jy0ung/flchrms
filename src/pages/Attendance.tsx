import { useAttendanceHistory, useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Square } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const { data: history, isLoading } = useAttendanceHistory();
  const { data: today } = useTodayAttendance();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const statusColors: Record<string, string> = {
    present: 'badge-success',
    absent: 'badge-destructive',
    late: 'badge-warning',
    half_day: 'badge-info',
    on_leave: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <Card className="card-stat border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Clock className="w-4 h-4" />
                Time Tracking
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <Clock className="w-7 h-7 text-accent" />
                  Attendance
                </h1>
                <p className="text-muted-foreground mt-1">Track your work hours</p>
              </div>
            </div>
            <div className="w-full lg:w-auto">
              {!today ? (
                <Button
                  onClick={() => clockIn.mutate()}
                  disabled={clockIn.isPending}
                  className="bg-success hover:bg-success/90 rounded-full w-full lg:w-auto"
                >
                  <Play className="w-4 h-4 mr-2" /> Clock In
                </Button>
              ) : !today.clock_out ? (
                <Button
                  onClick={() => clockOut.mutate()}
                  disabled={clockOut.isPending}
                  variant="destructive"
                  className="rounded-full w-full lg:w-auto"
                >
                  <Square className="w-4 h-4 mr-2" /> Clock Out
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Badge className={`mt-2 ${statusColors[today.status]}`}>{today.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-stat border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : history?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No attendance records</div>
          ) : (
            <>
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
                  <Badge className={statusColors[record.status]}>{record.status}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto rounded-b-xl">
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
                {history?.map(record => (
                    <tr key={record.id} className="border-t border-border table-row-hover">
                      <td className="p-4 font-medium">{format(new Date(record.date), 'EEE, MMM d, yyyy')}</td>
                      <td className="p-4">{record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '-'}</td>
                      <td className="p-4">{record.clock_out ? format(new Date(record.clock_out), 'h:mm a') : '-'}</td>
                      <td className="p-4"><Badge className={statusColors[record.status]}>{record.status}</Badge></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
