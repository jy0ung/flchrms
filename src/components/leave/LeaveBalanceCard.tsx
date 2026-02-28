import { Skeleton } from '@/components/ui/skeleton';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { LeaveBalanceSection } from '@/components/leave/LeaveBalanceSection';

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

  return <LeaveBalanceSection balances={balances} />;
}
