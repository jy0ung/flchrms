import { LeaveBalancePanel } from '@/components/leave/LeaveBalancePanel';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';

interface LeaveTabProps {
  balances?: LeaveBalance[];
  isLoading: boolean;
}

export function LeaveTab({ balances, isLoading }: LeaveTabProps) {
  return (
    <LeaveBalancePanel
      balances={balances}
      isLoading={isLoading}
      title="Leave balances"
      description="Current entitlement, pending requests, and remaining balance for this employee."
      emptyDescription="No leave balance data is available for this employee."
      variant="summary"
      maxPrimaryCards={4}
      defaultCollapsedSecondary={false}
    />
  );
}
