import { useId, useMemo, useState } from 'react';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import { Button } from '@/components/ui/button';
import { LeaveBalanceMetricCard } from '@/components/leave/LeaveBalanceMetricCard';
import { cn } from '@/lib/utils';

export type LeaveBalanceSectionVariant = 'prominent' | 'summary';

export interface LeaveBalanceSectionProps {
  balances: LeaveBalance[];
  maxPrimaryCards?: number;
  defaultCollapsedSecondary?: boolean;
  variant?: LeaveBalanceSectionVariant;
  className?: string;
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
  variant = 'prominent',
  className,
}: LeaveBalanceSectionProps) {
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(defaultCollapsedSecondary);
  const regionId = useId();

  const { showPrimary, showSecondary } = useMemo(() => {
    return {
      showPrimary: balances.slice(0, maxPrimaryCards),
      showSecondary: balances.slice(maxPrimaryCards),
    };
  }, [balances, maxPrimaryCards]);

  const secondaryRegionId = `leave-balance-secondary-region-${regionId}`;
  const gridClassName = cn(
    'grid min-w-0',
    variant === 'summary'
      ? 'gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]'
      : 'gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]',
  );
  const cardSize = variant === 'summary' ? 'compact' : 'default';

  if (!balances.length) {
    return null;
  }

  return (
    <section aria-label="Leave balance overview" className={cn('space-y-3 min-w-0', className)}>
      <div className={gridClassName}>
        {showPrimary.map((balance) => (
          <LeaveBalanceMetricCard
            key={balance.leave_type_id}
            balance={balance}
            size={cardSize}
          />
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
            <div id={secondaryRegionId} className={gridClassName}>
              {showSecondary.map((balance) => (
                <LeaveBalanceMetricCard
                  key={balance.leave_type_id}
                  balance={balance}
                  size={cardSize}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
