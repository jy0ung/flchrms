import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary';
import { Users, Calendar, Clock, GraduationCap, Play, Square, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { profile, role } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: announcements } = useAnnouncements();
  const { data: todayAttendance } = useTodayAttendance();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const isManagerOrAbove = role === 'manager' || role === 'hr' || role === 'admin';

  const statCards = [
    { title: 'Total Employees', value: stats?.totalEmployees || 0, icon: Users, color: 'text-info' },
    { title: 'Present Today', value: stats?.presentToday || 0, icon: Clock, color: 'text-success' },
    { title: 'Pending Leaves', value: stats?.pendingLeaves || 0, icon: Calendar, color: 'text-warning' },
    { title: 'Active Trainings', value: stats?.activeTrainings || 0, icon: GraduationCap, color: 'text-accent' },
  ];

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    normal: 'bg-info/10 text-info',
    high: 'bg-warning/10 text-warning',
    urgent: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {profile?.first_name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} • {role && <span className="capitalize">{role}</span>}
        </p>
      </div>

      {/* Executive Summary for Managers/Admin/HR */}
      {isManagerOrAbove && <ExecutiveSummary />}

      {/* Quick Actions - Clock In/Out */}
      <Card className="card-stat">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            {todayAttendance ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Clocked in at {format(new Date(todayAttendance.clock_in!), 'h:mm a')}
                </p>
                {todayAttendance.clock_out && (
                  <p className="text-sm text-muted-foreground">
                    Clocked out at {format(new Date(todayAttendance.clock_out), 'h:mm a')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">You haven't clocked in today</p>
            )}
          </div>
          <div className="flex gap-2">
            {!todayAttendance ? (
              <Button onClick={() => clockIn.mutate()} disabled={clockIn.isPending} className="bg-success hover:bg-success/90">
                <Play className="w-4 h-4 mr-2" />
                Clock In
              </Button>
            ) : !todayAttendance.clock_out ? (
              <Button onClick={() => clockOut.mutate()} disabled={clockOut.isPending} variant="destructive">
                <Square className="w-4 h-4 mr-2" />
                Clock Out
              </Button>
            ) : (
              <Badge className="badge-success">Completed</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Only show for regular employees or as quick reference */}
      {!isManagerOrAbove && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title} className="card-stat">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Announcements */}
      <Card className="card-stat">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-accent" />
            Announcements
          </CardTitle>
          <CardDescription>Latest company updates</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No announcements yet</p>
          ) : (
            <div className="space-y-4">
              {announcements?.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold">{announcement.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{announcement.content}</p>
                    </div>
                    <Badge className={priorityColors[announcement.priority as string] || priorityColors.normal}>
                      {announcement.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(announcement.published_at!), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
