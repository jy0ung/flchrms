import { Card, CardContent } from '@/components/ui/card';
import { CardHeaderStandard } from '@/components/system';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';

interface LeaveBalanceMetricCardProps {
  balance: LeaveBalance;
}

export function LeaveBalanceMetricCard({ balance }: LeaveBalanceMetricCardProps) {
  const isLow = balance.days_remaining <= 2 && balance.days_remaining > 0;
  const isExhausted = balance.days_remaining <= 0;

  return (
    <Card
      className={`h-[128px] overflow-hidden border-border shadow-sm ${
        isExhausted
          ? 'border-destructive/30 bg-destructive/5'
          : isLow
            ? 'border-orange-500/30 bg-orange-500/5'
            : ''
      }`}
    >
      <CardHeaderStandard
        title={balance.leave_type_name}
        description={balance.days_pending > 0 ? `${balance.days_pending} pending` : undefined}
        className="p-4 pb-1"
        titleClassName="line-clamp-2 text-base leading-snug"
        descriptionClassName="text-xs"
      />
      <CardContent className="px-4 pb-4 pt-1">
        <div className="flex items-baseline gap-1">
          <span
            className={`text-2xl font-bold leading-none ${
              isExhausted ? 'text-destructive' : isLow ? 'text-orange-600' : 'text-foreground'
            }`}
          >
            {balance.days_remaining}
          </span>
          <span className="text-xs text-muted-foreground">/ {balance.days_allowed}</span>
        </div>
      </CardContent>
    </Card>
  );
}

