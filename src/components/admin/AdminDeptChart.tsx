import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { DeptDistribution } from '@/hooks/admin/useAdminAnalytics';

interface AdminDeptChartProps {
  data: DeptDistribution[];
}

export function AdminDeptChart({ data }: AdminDeptChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        No department data available
      </div>
    );
  }

  const summary = data
    .slice(0, 4)
    .map((item) => `${item.department}: ${item.count}`)
    .join(', ');

  return (
    <div className="h-[250px] w-full">
      <p className="sr-only">Department distribution summary. {summary}.</p>
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} accessibilityLayer={false}>
            <XAxis
              dataKey="department"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
