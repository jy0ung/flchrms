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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="w-8 h-8 text-accent" />
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">Track your work hours</p>
        </div>
        <div className="flex gap-2">
          {!today ? (
            <Button onClick={() => clockIn.mutate()} disabled={clockIn.isPending} className="bg-success hover:bg-success/90">
              <Play className="w-4 h-4 mr-2" /> Clock In
            </Button>
          ) : !today.clock_out ? (
            <Button onClick={() => clockOut.mutate()} disabled={clockOut.isPending} variant="destructive">
              <Square className="w-4 h-4 mr-2" /> Clock Out
            </Button>
          ) : null}
        </div>
      </div>

      {today && (
        <Card className="card-stat bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
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

      <Card className="card-stat">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                {isLoading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : history?.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No attendance records</td></tr>
                ) : (
                  history?.map(record => (
                    <tr key={record.id} className="border-t border-border table-row-hover">
                      <td className="p-4 font-medium">{format(new Date(record.date), 'EEE, MMM d, yyyy')}</td>
                      <td className="p-4">{record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '-'}</td>
                      <td className="p-4">{record.clock_out ? format(new Date(record.clock_out), 'h:mm a') : '-'}</td>
                      <td className="p-4"><Badge className={statusColors[record.status]}>{record.status}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
