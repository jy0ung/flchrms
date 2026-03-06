import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import type { LeaveRequest } from '@/types/hrms';

interface BalanceContextTabProps {
  request: LeaveRequest;
  balances: LeaveBalance[] | undefined;
  isLoading: boolean;
  error: unknown;
}

export function BalanceContextTab({
  request,
  balances,
  isLoading,
  error,
}: BalanceContextTabProps) {
  const matchingBalance = balances?.find((balance) => balance.leave_type_id === request.leave_type_id);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading leave balance context...</p>;
  }

  if (error || !matchingBalance) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Balance Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Balance is not available in this environment for the selected request.</p>
          <p>Requested days: {request.days_count}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Current Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Leave Type:</span> {matchingBalance.leave_type_name}</p>
          <p><span className="text-muted-foreground">Entitled:</span> {matchingBalance.is_unlimited ? 'Unlimited' : matchingBalance.entitled_days}</p>
          <p><span className="text-muted-foreground">Used:</span> {matchingBalance.days_used}</p>
          <p><span className="text-muted-foreground">Pending:</span> {matchingBalance.days_pending}</p>
          <p><span className="text-muted-foreground">Remaining:</span> {matchingBalance.is_unlimited ? 'Unlimited' : matchingBalance.days_remaining}</p>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Request Impact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Requested Days:</span> {request.days_count}</p>
          <p><span className="text-muted-foreground">Cycle Start:</span> {matchingBalance.cycle_start}</p>
          <p><span className="text-muted-foreground">Cycle End:</span> {matchingBalance.cycle_end}</p>
          <p><span className="text-muted-foreground">Balance Source:</span> {matchingBalance.source}</p>
        </CardContent>
      </Card>
    </div>
  );
}
