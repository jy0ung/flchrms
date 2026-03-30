import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, StatSkeleton, TableRowSkeleton } from '@/components/system';

interface AdminLoadingFrameProps {
  title: string;
  description: string;
  children: ReactNode;
}

function AdminLoadingFrame({ title, description, children }: AdminLoadingFrameProps) {
  return (
    <section role="status" aria-live="polite" className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Loading state
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function AdminDashboardLoadingSkeleton({
  title,
  description,
}: Pick<AdminLoadingFrameProps, 'title' | 'description'>) {
  return (
    <AdminLoadingFrame title={title} description={description}>
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Act first
          </p>
          <h3 className="text-base font-semibold text-foreground">Governance Priorities</h3>
          <p className="text-sm text-muted-foreground">
            Preparing alerts, workspace entry points, and policy signals.
          </p>
        </div>
        <CardSkeleton count={2} className="lg:grid-cols-2" />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Scan next
          </p>
          <h3 className="text-base font-semibold text-foreground">Operational Snapshot</h3>
          <p className="text-sm text-muted-foreground">
            Holding your workforce and activity totals in place while the latest data arrives.
          </p>
        </div>
        <StatSkeleton count={4} />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Reference
          </p>
          <h3 className="text-base font-semibold text-foreground">Reference Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Preparing department and leave trends without interrupting the governance flow.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index} className="border-border shadow-sm">
              <CardContent className="space-y-4 p-4">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-56 w-full rounded-2xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AdminLoadingFrame>
  );
}

export function AdminQuickActionsLoadingSkeleton({
  title,
  description,
}: Pick<AdminLoadingFrameProps, 'title' | 'description'>) {
  return (
    <AdminLoadingFrame title={title} description={description}>
      {[
        {
          id: 'workspaces',
          title: 'Operational Workspaces',
          description: 'Preparing the module workspaces that match your role.',
        },
        {
          id: 'governance',
          title: 'Governance Controls',
          description: 'Preparing policy, audit, and system-control entry points.',
        },
      ].map((section) => (
        <section key={section.id} className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          <CardSkeleton count={3} className="xl:grid-cols-3" />
        </section>
      ))}
    </AdminLoadingFrame>
  );
}

interface AdminTableLoadingSkeletonProps extends Pick<AdminLoadingFrameProps, 'title' | 'description'> {
  sectionTitle: string;
  sectionDescription: string;
  rows?: number;
  columns?: number;
}

export function AdminTableLoadingSkeleton({
  title,
  description,
  sectionTitle,
  sectionDescription,
  rows = 6,
  columns = 5,
}: AdminTableLoadingSkeletonProps) {
  return (
    <AdminLoadingFrame title={title} description={description}>
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{sectionTitle}</h3>
            <p className="text-sm text-muted-foreground">{sectionDescription}</p>
          </div>
          <TableRowSkeleton rows={rows} columns={columns} />
        </CardContent>
      </Card>
    </AdminLoadingFrame>
  );
}

export function AdminWorkspaceLoadingSkeleton({
  title,
  description,
}: Pick<AdminLoadingFrameProps, 'title' | 'description'>) {
  return (
    <AdminLoadingFrame title={title} description={description}>
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace selection
          </p>
          <h3 className="text-base font-semibold text-foreground">Policy workspaces</h3>
          <p className="text-sm text-muted-foreground">
            Holding the governance workspace map in place while policy capabilities resolve.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex min-h-[88px] items-start gap-3 rounded-2xl border border-border/70 bg-muted/25 px-4 py-3"
            >
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-5/6 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <Card className="border-border/60 bg-background/70 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current workspace
            </p>
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
          <TableRowSkeleton rows={4} columns={4} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Workspace summary</h3>
          <p className="text-sm text-muted-foreground">
            Preparing the supporting policy counts and access mode context.
          </p>
        </div>
        <StatSkeleton count={4} />
      </section>
    </AdminLoadingFrame>
  );
}
