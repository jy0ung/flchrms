/**
 * ChartsWidget — Tabbed attendance/leave/training charts for managers+.
 * Tabbed workforce analytics — attendance, leave, training.
 */
import { memo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { BarChart3 } from 'lucide-react';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { canViewManagerDashboardWidgets } from '@/lib/permissions';
import { cn } from '@/lib/utils';

import { DashboardWidgetCard } from './shared';
import { useDashboardData } from '../useDashboardData';

const CHART_CONFIG = {
  present: { label: 'Present', color: 'hsl(var(--success))' },
  absent: { label: 'Absent', color: 'hsl(var(--destructive))' },
  onLeave: { label: 'On Leave', color: 'hsl(var(--warning))' },
  pending: { label: 'Pending', color: 'hsl(var(--warning))' },
  approved: { label: 'Approved', color: 'hsl(var(--success))' },
  active: { label: 'Active', color: 'hsl(var(--info))' },
  completed: { label: 'Completed', color: 'hsl(var(--success))' },
};

type ChartTab = 'attendance' | 'leave' | 'training';

const TABS: Array<{ id: ChartTab; label: string }> = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'training', label: 'Training' },
];

function ChartsWidgetInner() {
  const { role } = useAuth();
  const { executiveStats: stats, executiveStatsLoading: isLoading } = useDashboardData();
  const [activeTab, setActiveTab] = useState<ChartTab>('attendance');

  const isManagerOrAbove = canViewManagerDashboardWidgets(role);
  if (!isManagerOrAbove) return null;

  if (isLoading) {
    return (
      <DashboardWidgetCard title="Analytics" description="Workforce analytics overview." icon={BarChart3}>
        <Skeleton className="h-56 rounded-lg" />
      </DashboardWidgetCard>
    );
  }

  if (!stats) return null;

  const attendanceData = [
    { name: 'Present', value: stats.presentToday, fill: 'hsl(var(--success))' },
    { name: 'Absent', value: stats.absentToday, fill: 'hsl(var(--destructive))' },
    { name: 'On Leave', value: stats.onLeaveToday, fill: 'hsl(var(--warning))' },
  ].filter((d) => d.value > 0);

  const leaveData = [
    { name: 'Pending', value: stats.pendingLeaveRequests, fill: 'hsl(var(--warning))' },
    { name: 'Approved', value: stats.approvedLeavesThisMonth, fill: 'hsl(var(--success))' },
  ];

  const trainingData = [
    { name: 'Active', value: stats.activeTrainings, fill: 'hsl(var(--info))' },
    { name: 'Completed', value: stats.completedTrainingsThisMonth, fill: 'hsl(var(--success))' },
  ];

  return (
    <DashboardWidgetCard
      title="Analytics"
      description="Workforce analytics overview."
      icon={BarChart3}
      action={
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mt-1">
        {activeTab === 'attendance' && (
          <div>
            <ChartContainer config={CHART_CONFIG} className="h-48 w-full md:h-56">
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
            <ChartLegend
              items={[
                { color: 'bg-success', label: 'Present', value: stats.presentToday },
                { color: 'bg-destructive', label: 'Absent', value: stats.absentToday },
                { color: 'bg-warning', label: 'Leave', value: stats.onLeaveToday },
              ]}
            />
          </div>
        )}

        {activeTab === 'leave' && (
          <div>
            <ChartContainer config={CHART_CONFIG} className="h-48 w-full md:h-56">
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
            <ChartLegend
              items={[
                { color: 'bg-warning', label: 'Pending', value: stats.pendingLeaveRequests },
                { color: 'bg-success', label: 'Approved', value: stats.approvedLeavesThisMonth },
              ]}
            />
          </div>
        )}

        {activeTab === 'training' && (
          <div>
            <ChartContainer config={CHART_CONFIG} className="h-48 w-full md:h-56">
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
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#trainingGradient)" strokeWidth={2} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            <ChartLegend
              items={[
                { color: 'bg-info', label: 'Active', value: stats.activeTrainings },
                { color: 'bg-success', label: 'Completed', value: stats.completedTrainingsThisMonth },
              ]}
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {stats.trainingCompletionRate}% completion rate
            </p>
          </div>
        )}
      </div>
    </DashboardWidgetCard>
  );
}

function ChartLegend({ items }: { items: Array<{ color: string; label: string; value: number }> }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs md:gap-4 md:text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
          <span className="text-muted-foreground">
            {item.label}: {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export const ChartsWidget = memo(ChartsWidgetInner);
