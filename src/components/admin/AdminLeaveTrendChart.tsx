import { Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { LeaveTrendPoint } from '@/hooks/admin/useAdminAnalytics';

interface AdminLeaveTrendChartProps {
  data: LeaveTrendPoint[];
}

export function AdminLeaveTrendChart({ data }: AdminLeaveTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        No leave data available
      </div>
    );
  }

  const summary = data
    .slice(-4)
    .map((item) => `${item.month}: ${item.requests}`)
    .join(', ');

  return (
    <div className="h-[250px] w-full">
      <p className="sr-only">Leave request trend summary. {summary}.</p>
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} accessibilityLayer={false}>
            <XAxis
              dataKey="month"
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
            <Line
              type="monotone"
              dataKey="requests"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
