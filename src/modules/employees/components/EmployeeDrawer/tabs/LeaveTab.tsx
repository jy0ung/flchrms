import { CalendarDays, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';

interface LeaveTabProps {
  balances?: LeaveBalance[];
  isLoading: boolean;
}

export function LeaveTab({ balances, isLoading }: LeaveTabProps) {
  if (isLoading) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading leave balances...
        </CardContent>
      </Card>
    );
  }

  if (!balances?.length) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No leave balance data is available for this employee.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Leave Balances
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {balances.map((balance) => (
          <div key={balance.leave_type_id} className="rounded-lg border border-border/60 bg-card px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{balance.leave_type_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Source: {balance.source.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{balance.is_unlimited ? 'Unlimited' : `${balance.days_remaining} remaining`}</p>
                <p>{balance.days_used} used</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="rounded-md bg-muted/50 px-2 py-2">Allowed: {balance.days_allowed}</div>
              <div className="rounded-md bg-muted/50 px-2 py-2">Pending: {balance.days_pending}</div>
              <div className="rounded-md bg-muted/50 px-2 py-2">Entitled: {balance.entitled_days}</div>
              <div className="rounded-md bg-muted/50 px-2 py-2">Cycle end: {balance.cycle_end}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
