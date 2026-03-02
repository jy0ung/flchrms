import { useMemo, useState } from 'react';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import { Button } from '@/components/ui/button';
import { LeaveBalanceMetricCard } from '@/components/leave/LeaveBalanceMetricCard';

export interface LeaveBalanceSectionProps {
  balances: LeaveBalance[];
  maxPrimaryCards?: number;
  defaultCollapsedSecondary?: boolean;
}

/**
 * Renders leave balance cards.
 *
 * The `balances` array is already filtered & ordered by the parent
 * (via `useLeaveDisplayPrefs`). This component simply splits the list
 * into primary (first N) and secondary (the rest, collapsible).
 */
export function LeaveBalanceSection({
  balances,
  maxPrimaryCards = 4,
  defaultCollapsedSecondary = true,
}: LeaveBalanceSectionProps) {
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(defaultCollapsedSecondary);

  const { showPrimary, showSecondary } = useMemo(() => {
    return {
      showPrimary: balances.slice(0, maxPrimaryCards),
      showSecondary: balances.slice(maxPrimaryCards),
    };
  }, [balances, maxPrimaryCards]);

  const secondaryRegionId = 'leave-balance-secondary-region';

  if (!balances.length) {
    return null;
  }

  return (
    <section aria-label="Leave balance overview" className="space-y-3">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {showPrimary.map((balance) => (
          <LeaveBalanceMetricCard key={balance.leave_type_id} balance={balance} />
        ))}
      </div>

      {showSecondary.length > 0 ? (
        <div className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-full px-3 text-xs text-muted-foreground"
            aria-expanded={!secondaryCollapsed}
            aria-controls={secondaryRegionId}
            onClick={() => setSecondaryCollapsed((current) => !current)}
          >
            {secondaryCollapsed
              ? `Show ${showSecondary.length} more leave types`
              : 'Hide additional leave types'}
          </Button>

          {!secondaryCollapsed ? (
            <div id={secondaryRegionId} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {showSecondary.map((balance) => (
                <LeaveBalanceMetricCard key={balance.leave_type_id} balance={balance} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
