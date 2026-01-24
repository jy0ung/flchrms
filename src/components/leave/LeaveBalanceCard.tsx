import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { CalendarDays, Clock, CheckCircle2 } from 'lucide-react';

interface LeaveBalanceCardProps {
  employeeId?: string;
  compact?: boolean;
}

export function LeaveBalanceCard({ employeeId, compact = false }: LeaveBalanceCardProps) {
  const { data: balances, isLoading } = useLeaveBalance(employeeId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5 text-accent" />
            Leave Balance
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? 'pt-0' : ''}>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!balances?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="w-5 h-5 text-accent" />
          Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className={compact ? 'grid grid-cols-2 gap-3' : 'space-y-4'}>
          {balances.map(balance => {
            const usagePercent = balance.days_allowed > 0 
              ? ((balance.days_used / balance.days_allowed) * 100) 
              : 0;
            const isLow = balance.days_remaining <= 2 && balance.days_remaining > 0;
            const isExhausted = balance.days_remaining <= 0;

            return (
              <div 
                key={balance.leave_type_id} 
                className={`p-3 rounded-lg border bg-card ${compact ? '' : 'space-y-2'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{balance.leave_type_name}</span>
                  {isExhausted ? (
                    <Badge variant="destructive" className="text-xs">Exhausted</Badge>
                  ) : isLow ? (
                    <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/30">Low</Badge>
                  ) : null}
                </div>
                
                {!compact && (
                  <Progress 
                    value={Math.min(usagePercent, 100)} 
                    className="h-2"
                  />
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {balance.days_used} used
                    </span>
                    {balance.days_pending > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-yellow-500" />
                        {balance.days_pending} pending
                      </span>
                    )}
                  </div>
                  <span className={`font-semibold ${isExhausted ? 'text-destructive' : isLow ? 'text-orange-500' : 'text-primary'}`}>
                    {balance.days_remaining}/{balance.days_allowed}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
