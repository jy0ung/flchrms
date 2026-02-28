import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { AppPageContainer, PageHeader } from '@/components/system';
import { cn } from '@/lib/utils';

interface AdminSurfaceShellProps {
  header: ReactNode;
  contextBar?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  classificationLabel?: string;
  modeControls?: ReactNode;
  primaryAction?: ReactNode;
  actions?: ReactNode;
}

interface AdminContextBarItem {
  id: string;
  label: string;
  value: ReactNode;
}

interface AdminContextBarProps {
  items: AdminContextBarItem[];
  actions?: ReactNode;
  className?: string;
}

interface AdminWorkspaceProps {
  children: ReactNode;
  className?: string;
}

export function AdminSurfaceShell({
  header,
  contextBar,
  children,
  className,
}: AdminSurfaceShellProps) {
  return (
    <AppPageContainer spacing="compact" className={className}>
      {header}
      {contextBar}
      {children}
    </AppPageContainer>
  );
}

export function AdminHeader({
  title,
  subtitle,
  classificationLabel = 'Admin Surface',
  modeControls,
  primaryAction,
  actions,
}: AdminHeaderProps) {
  return (
    <PageHeader
      shellDensity="compact"
      title={title}
      description={subtitle}
      chipsSlot={
        <Badge variant="outline" className="inline-flex items-center gap-1.5 text-[11px]">
          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          {classificationLabel}
        </Badge>
      }
      actionsSlot={(
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end">
          {modeControls}
          {primaryAction}
          {actions}
        </div>
      )}
    />
  );
}

export function AdminContextBar({ items, actions, className }: AdminContextBarProps) {
  return (
    <section
      role="region"
      aria-label="Admin governance context"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="truncate text-sm font-medium text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </section>
  );
}

export function AdminWorkspace({ children, className }: AdminWorkspaceProps) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}
