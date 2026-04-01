import type { ReactNode } from 'react';
import { Loader2, WalletCards } from 'lucide-react';

import { LeaveBalanceSection } from '@/components/leave/LeaveBalanceSection';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import { cn } from '@/lib/utils';

export type LeaveBalancePanelVariant = 'prominent' | 'summary';

export interface LeaveBalancePanelProps {
  balances?: LeaveBalance[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxPrimaryCards?: number;
  defaultCollapsedSecondary?: boolean;
  variant?: LeaveBalancePanelVariant;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function LeaveBalancePanel({
  balances,
  isLoading = false,
  title = 'My leave balances',
  description = 'Track current entitlement, pending requests, and remaining balance by leave type.',
  emptyTitle = 'No balances available',
  emptyDescription = 'Leave balance buckets will appear here once they are available for your account.',
  maxPrimaryCards = 4,
  defaultCollapsedSecondary = true,
  variant = 'prominent',
  action,
  className,
  contentClassName,
}: LeaveBalancePanelProps) {
  const hasBalances = (balances?.length ?? 0) > 0;

  return (
    <Card
      className={cn(
        'min-w-0 border-border/70 shadow-sm',
        variant === 'prominent' && 'bg-background',
        variant === 'summary' && 'bg-muted/10',
        className,
      )}
    >
      <CardHeader
        className={cn(
          'space-y-1',
          variant === 'summary' ? 'pb-3' : 'pb-4',
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className={cn(variant === 'summary' ? 'text-sm' : 'text-base')}>
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', contentClassName)}>
        {isLoading ? (
          <div
            aria-label="Loading leave balances"
            className={cn(
              'grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]',
              variant === 'prominent' && '[grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]',
            )}
          >
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="flex min-h-[112px] items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-4"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : hasBalances ? (
          <LeaveBalanceSection
            balances={balances ?? []}
            maxPrimaryCards={maxPrimaryCards}
            defaultCollapsedSecondary={defaultCollapsedSecondary}
            variant={variant}
          />
        ) : (
          <WorkspaceStatePanel
            title={emptyTitle}
            description={emptyDescription}
            icon={WalletCards}
            appearance="default"
            align="start"
            className="border-none shadow-none"
          />
        )}
      </CardContent>
    </Card>
  );
}
