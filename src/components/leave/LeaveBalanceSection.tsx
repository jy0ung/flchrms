import { useMemo, useState } from 'react';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import { Button } from '@/components/ui/button';
import { LeaveBalanceMetricCard } from '@/components/leave/LeaveBalanceMetricCard';

export interface LeaveBalanceSectionProps {
  balances: LeaveBalance[];
  priorityTypeNames?: string[];
  maxPrimaryCards?: number;
  defaultCollapsedSecondary?: boolean;
}

const DEFAULT_PRIORITY = ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Unpaid Leave'];

function normalizeTypeName(name: string) {
  return name.trim().toLowerCase();
}

export function LeaveBalanceSection({
  balances,
  priorityTypeNames = DEFAULT_PRIORITY,
  maxPrimaryCards = 4,
  defaultCollapsedSecondary = true,
}: LeaveBalanceSectionProps) {
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(defaultCollapsedSecondary);

  const { primaryBalances, secondaryBalances } = useMemo(() => {
    const byNormalizedName = new Map(
      balances.map((balance) => [normalizeTypeName(balance.leave_type_name), balance] as const),
    );
    const usedIds = new Set<string>();

    const priorityMatches = priorityTypeNames
      .map((name) => byNormalizedName.get(normalizeTypeName(name)))
      .filter((balance): balance is LeaveBalance => Boolean(balance))
      .filter((balance) => {
        if (usedIds.has(balance.leave_type_id)) return false;
        usedIds.add(balance.leave_type_id);
        return true;
      });

    const remaining = balances.filter((balance) => !usedIds.has(balance.leave_type_id));

    const primary = priorityMatches.slice(0, maxPrimaryCards);
    const secondary = [
      ...priorityMatches.slice(maxPrimaryCards),
      ...remaining,
    ];

    return { primaryBalances: primary, secondaryBalances: secondary };
  }, [balances, maxPrimaryCards, priorityTypeNames]);

  const showPrimary = primaryBalances.length > 0 ? primaryBalances : balances.slice(0, maxPrimaryCards);
  const showSecondary = primaryBalances.length > 0
    ? secondaryBalances
    : balances.slice(maxPrimaryCards);
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

