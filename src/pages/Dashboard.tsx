import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useTodayAttendance, useClockIn, useClockOut } from '@/hooks/useAttendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Users, Calendar, Clock, GraduationCap, Play, Square, Megaphone, Building2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { profile, role } = useAuth();
  const { data: stats } = useDashboardStats();
  const { data: announcements } = useAnnouncements();
  const { data: todayAttendance } = useTodayAttendance();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const isManagerOrAbove = role === 'manager' || role === 'general_manager' || role === 'director' || role === 'hr' || role === 'admin';

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
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Welcome back, {profile?.first_name}!
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} • {role && <span className="capitalize">{role}</span>}
        </p>
      </div>

      {/* Executive Summary Header for Managers/Admin/HR */}
      {isManagerOrAbove && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Executive Summary</h2>
            <p className="text-sm text-muted-foreground">
              {role === 'manager' ? 'Department Overview' : 'Company Overview'}
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats for Managers/Admin/HR */}
      {isManagerOrAbove && <QuickStats />}

      {/* Charts for Managers/Admin/HR */}
      {isManagerOrAbove && <DashboardCharts />}

      {/* Quick Actions - Clock In/Out */}
      <Card className="card-stat">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <Button 
                  onClick={() => clockIn.mutate()} 
                  disabled={clockIn.isPending} 
                  className="bg-success hover:bg-success/90 w-full sm:w-auto"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Clock In
                </Button>
              ) : !todayAttendance.clock_out ? (
                <Button 
                  onClick={() => clockOut.mutate()} 
                  disabled={clockOut.isPending} 
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Clock Out
                </Button>
              ) : (
                <Badge className="badge-success">Completed</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Only show for regular employees */}
      {!isManagerOrAbove && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title} className="card-stat">
              <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-2 md:p-3 rounded-xl bg-muted shrink-0 ${stat.color}`}>
                    <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Announcements */}
      <Card className="card-stat">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-accent" />
            Announcements
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Latest company updates</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements?.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 md:py-8 text-sm">No announcements yet</p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {announcements?.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="p-3 md:p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm md:text-base truncate">{announcement.title}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{announcement.content}</p>
                    </div>
                    <Badge className={`shrink-0 text-xs ${priorityColors[announcement.priority as string] || priorityColors.normal}`}>
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
