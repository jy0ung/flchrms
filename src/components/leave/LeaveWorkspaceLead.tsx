import type { ReactNode } from 'react';

import { ContextChip } from '@/components/system';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { cn } from '@/lib/utils';

interface LeaveWorkspaceLeadProps {
  title: string;
  description: string;
  modeLabel: string;
  primaryTitle?: string;
  primaryDescription?: string;
  secondaryTitle?: string;
  secondaryDescription?: string;
  variant?: 'operational' | 'governance';
  showOverviewCards?: boolean;
  metaSlot?: ReactNode;
  navigation?: ReactNode;
  supportingPanel?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

function OverviewCard({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function LeaveWorkspaceLead({
  title,
  description,
  modeLabel,
  primaryTitle,
  primaryDescription,
  secondaryTitle,
  secondaryDescription,
  variant = 'operational',
  showOverviewCards = true,
  metaSlot,
  navigation,
  supportingPanel,
  actions,
  className,
}: LeaveWorkspaceLeadProps) {
  return (
    <ModuleLayout.WorkspaceLead
      eyebrow={variant === 'governance' ? 'Leave governance' : 'Leave workspace'}
      title={title}
      description={description}
      actions={actions}
      metaSlot={(
        <>
          <ContextChip className="rounded-full">{modeLabel}</ContextChip>
          {metaSlot}
        </>
      )}
      className={className}
    >
      {navigation ? (
        <section className={cn('space-y-3', variant === 'operational' && 'space-y-2')}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace navigation
          </p>
          <div className="space-y-4">{navigation}</div>
        </section>
      ) : null}

      {showOverviewCards && primaryTitle && primaryDescription && secondaryTitle && secondaryDescription ? (
        <div
          className={cn(
            'grid gap-3 lg:grid-cols-2',
            variant === 'operational' && 'gap-2.5',
            !navigation && !supportingPanel && 'lg:grid-cols-2',
          )}
        >
          <OverviewCard
            label={variant === 'governance' ? 'Primary work' : 'Current focus'}
            title={primaryTitle}
            description={primaryDescription}
          />
          <OverviewCard
            label="Supporting context"
            title={secondaryTitle}
            description={secondaryDescription}
          />
        </div>
      ) : null}

      {supportingPanel ? (
        <section className={cn('space-y-3', variant === 'operational' && 'space-y-2')}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {variant === 'governance' ? 'Supporting reference' : 'Balance reference'}
          </p>
          {supportingPanel}
        </section>
      ) : null}
    </ModuleLayout.WorkspaceLead>
  );
}
