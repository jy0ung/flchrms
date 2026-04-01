import type { ReactNode } from 'react';

import { ContextChip } from '@/components/system';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { cn } from '@/lib/utils';

interface LeaveWorkspaceLeadProps {
  title: string;
  description: string;
  modeLabel: string;
  primaryTitle: string;
  primaryDescription: string;
  secondaryTitle: string;
  secondaryDescription: string;
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
  metaSlot,
  navigation,
  supportingPanel,
  actions,
  className,
}: LeaveWorkspaceLeadProps) {
  return (
    <ModuleLayout.WorkspaceLead
      eyebrow="Leave workspace"
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
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace navigation
          </p>
          <div className="space-y-4">{navigation}</div>
        </section>
      ) : null}

      <div className={cn('grid gap-3 lg:grid-cols-2', !navigation && !supportingPanel && 'lg:grid-cols-2')}>
        <OverviewCard
          label="Primary work"
          title={primaryTitle}
          description={primaryDescription}
        />
        <OverviewCard
          label="Supporting context"
          title={secondaryTitle}
          description={secondaryDescription}
        />
      </div>

      {supportingPanel ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Supporting reference
          </p>
          {supportingPanel}
        </section>
      ) : null}
    </ModuleLayout.WorkspaceLead>
  );
}
