import { Card, CardContent } from '@/components/ui/card';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import { cn } from '@/lib/utils';

interface LeaveBalanceMetricCardProps {
  balance: LeaveBalance;
  size?: 'default' | 'compact';
}

function ProgressRing({
  remaining,
  total,
  pending,
  isUnlimited,
  size = 'default',
}: {
  remaining: number;
  total: number;
  pending: number;
  isUnlimited: boolean;
  size?: 'default' | 'compact';
}) {
  const svgSize = size === 'compact' ? 56 : 64;
  const strokeWidth = size === 'compact' ? 4.5 : 5;
  const radius = (svgSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.max(remaining, 0) / total : 0;
  const offset = circumference * (1 - pct);
  const pendingPct = total > 0 ? pending / total : 0;
  const pendingOffset = circumference * (1 - pendingPct);

  const color =
    isUnlimited
      ? 'text-primary'
      : remaining <= 0
        ? 'text-destructive'
        : remaining <= 2
          ? 'text-orange-500'
          : 'text-primary';

  return (
    <svg width={svgSize} height={svgSize} className="shrink-0" aria-hidden="true">
      {/* Background track */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      {/* Pending arc (amber) */}
      {pending > 0 && !isUnlimited && (
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-amber-400/40"
          strokeDasharray={circumference}
          strokeDashoffset={pendingOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
        />
      )}
      {/* Remaining arc */}
      {isUnlimited ? (
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={cn(color, 'transition-all duration-500')}
          strokeDasharray="3 4"
        />
      ) : (
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={cn(color, 'transition-all duration-500')}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
        />
      )}
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className={cn('fill-current font-bold', color)}
        fontSize={size === 'compact' ? '14' : '16'}
      >
        {isUnlimited ? '∞' : remaining}
      </text>
    </svg>
  );
}

export function LeaveBalanceMetricCard({
  balance,
  size = 'default',
}: LeaveBalanceMetricCardProps) {
  const isUnlimited = balance.is_unlimited;
  const isLow = !isUnlimited && balance.days_remaining <= 2 && balance.days_remaining > 0;
  const isExhausted = !isUnlimited && balance.days_remaining <= 0;

  return (
    <Card
      className={cn(
        'w-full min-w-0 overflow-hidden border-border shadow-sm transition-colors',
        size === 'compact' ? 'min-h-[112px]' : 'min-h-[128px]',
        isExhausted && 'border-destructive/30 bg-destructive/5',
        isLow && !isExhausted && 'border-orange-500/30 bg-orange-500/5',
      )}
    >
      <CardContent className={cn('flex h-full items-center gap-3 p-4', size === 'compact' && 'gap-2.5 p-3.5')}>
        <ProgressRing
          remaining={balance.days_remaining}
          total={balance.days_allowed}
          pending={balance.days_pending}
          isUnlimited={isUnlimited}
          size={size}
        />
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium leading-tight line-clamp-2', size === 'compact' ? 'text-[13px]' : 'text-sm')}>
            {balance.leave_type_name}
          </p>
          <p className={cn('mt-1 text-muted-foreground', size === 'compact' ? 'text-[11px]' : 'text-xs')}>
            {isUnlimited ? 'Unlimited leave' : `of ${balance.days_allowed} days`}
          </p>
          {balance.days_pending > 0 && (
            <p className="mt-0.5 text-[11px] text-amber-600">
              {balance.days_pending} pending
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
