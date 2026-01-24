import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';

interface LeaveBalanceCardProps {
  employeeId?: string;
}

export function LeaveBalanceCard({ employeeId }: LeaveBalanceCardProps) {
  const { data: balances, isLoading } = useLeaveBalance(employeeId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!balances?.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {balances.map(balance => {
        const isLow = balance.days_remaining <= 2 && balance.days_remaining > 0;
        const isExhausted = balance.days_remaining <= 0;

        return (
          <Card 
            key={balance.leave_type_id} 
            className={`relative overflow-hidden transition-all hover:shadow-md ${
              isExhausted 
                ? 'border-destructive/30 bg-destructive/5' 
                : isLow 
                  ? 'border-orange-500/30 bg-orange-500/5' 
                  : 'hover:border-primary/30'
            }`}
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground truncate mb-2">
                {balance.leave_type_name}
              </p>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${
                  isExhausted 
                    ? 'text-destructive' 
                    : isLow 
                      ? 'text-orange-500' 
                      : 'text-foreground'
                }`}>
                  {balance.days_remaining}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {balance.days_allowed}
                </span>
              </div>
              {balance.days_pending > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {balance.days_pending} pending
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
