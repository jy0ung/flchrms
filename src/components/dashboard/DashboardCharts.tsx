import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useExecutiveStats } from '@/hooks/useExecutiveStats';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  present: { label: 'Present', color: 'hsl(var(--success))' },
  absent: { label: 'Absent', color: 'hsl(var(--destructive))' },
  onLeave: { label: 'On Leave', color: 'hsl(var(--warning))' },
  pending: { label: 'Pending', color: 'hsl(var(--warning))' },
  approved: { label: 'Approved', color: 'hsl(var(--success))' },
  active: { label: 'Active', color: 'hsl(var(--info))' },
  completed: { label: 'Completed', color: 'hsl(var(--success))' },
  employees: { label: 'Employees', color: 'hsl(var(--primary))' },
};

export function DashboardCharts() {
  const { role } = useAuth();
  const { data: stats, isLoading } = useExecutiveStats();

  const isManagerOrAbove = role === 'manager' || role === 'hr' || role === 'admin';

  if (!isManagerOrAbove) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64 md:h-72" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Attendance Distribution Data
  const attendanceData = [
    { name: 'Present', value: stats.presentToday, fill: 'hsl(var(--success))' },
    { name: 'Absent', value: stats.absentToday, fill: 'hsl(var(--destructive))' },
    { name: 'On Leave', value: stats.onLeaveToday, fill: 'hsl(var(--warning))' },
  ].filter(d => d.value > 0);

  // Leave Status Data
  const leaveData = [
    { name: 'Pending', value: stats.pendingLeaveRequests, fill: 'hsl(var(--warning))' },
    { name: 'Approved', value: stats.approvedLeavesThisMonth, fill: 'hsl(var(--success))' },
  ];

  // Training Progress Data
  const trainingData = [
    { name: 'Active', value: stats.activeTrainings, fill: 'hsl(var(--info))' },
    { name: 'Completed', value: stats.completedTrainingsThisMonth, fill: 'hsl(var(--success))' },
  ];

  // Headcount Overview
  const headcountData = [
    { name: 'Total', employees: stats.totalEmployees },
    { name: 'Active', employees: stats.activeEmployees },
    { name: 'New', employees: stats.newHiresThisMonth },
  ];

  // Performance chart
  const performanceData = [
    { name: 'Pending', value: stats.pendingReviews },
    { name: 'Completed', value: stats.completedReviewsThisMonth },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {/* Attendance Distribution */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Today's Attendance</CardTitle>
          <CardDescription className="text-xs md:text-sm">Employee presence overview</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48 md:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData.length > 0 ? attendanceData : [{ name: 'No Data', value: 1, fill: 'hsl(var(--muted))' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-2 text-xs md:text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Present: {stats.presentToday}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Absent: {stats.absentToday}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span className="text-muted-foreground">Leave: {stats.onLeaveToday}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Leave Requests</CardTitle>
          <CardDescription className="text-xs md:text-sm">This month's status breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48 md:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-2 text-xs md:text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span className="text-muted-foreground">Pending: {stats.pendingLeaveRequests}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Approved: {stats.approvedLeavesThisMonth}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Progress */}
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg">Training Progress</CardTitle>
          <CardDescription className="text-xs md:text-sm">{stats.trainingCompletionRate}% completion rate</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48 md:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trainingData}>
                <defs>
                  <linearGradient id="trainingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="url(#trainingGradient)"
                  strokeWidth={2}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-2 text-xs md:text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-info" />
              <span className="text-muted-foreground">Active: {stats.activeTrainings}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Completed: {stats.completedTrainingsThisMonth}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
