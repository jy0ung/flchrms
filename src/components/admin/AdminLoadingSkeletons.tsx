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

export function AdminRolesLoadingSkeleton({
  title,
  description,
}: Pick<AdminLoadingFrameProps, 'title' | 'description'>) {
  return (
    <AdminLoadingFrame title={title} description={description}>
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Role assignments</h3>
          <p className="text-sm text-muted-foreground">
            Preparing the latest role roster, edit actions, and authority tiers.
          </p>
        </div>
        <TableRowSkeleton rows={5} columns={4} />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Capability matrix</h3>
          <p className="text-sm text-muted-foreground">
            Preparing the governance permissions reference that supports role decisions.
          </p>
        </div>
        <CardSkeleton count={4} className="lg:grid-cols-2 xl:grid-cols-4" />
      </section>
    </AdminLoadingFrame>
  );
}

export function AdminSettingsLoadingSkeleton({
  title,
  description,
}: Pick<AdminLoadingFrameProps, 'title' | 'description'>) {
  return (
    <AdminLoadingFrame title={title} description={description}>
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Company Branding</h3>
            <p className="text-sm text-muted-foreground">
              Preparing identity, logo, and theme controls for the current tenant.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-4 w-24 rounded" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }, (_, swatch) => (
                    <Skeleton key={swatch} className="h-8 w-8 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">General settings</h3>
          <p className="text-sm text-muted-foreground">
            Preparing locale, notification, and maintenance controls.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index} className="border-border shadow-sm">
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-48 rounded" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, row) => (
                    <Skeleton key={row} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AdminLoadingFrame>
  );
}

interface AdminDirectoryLoadingSkeletonProps extends Pick<AdminLoadingFrameProps, 'title' | 'description'> {
  workspaceTitle: string;
  workspaceDescription: string;
}

export function AdminDirectoryLoadingSkeleton({
  title,
  description,
  workspaceTitle,
  workspaceDescription,
}: AdminDirectoryLoadingSkeletonProps) {
  return (
    <AdminLoadingFrame title={title} description={description}>
      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{workspaceTitle}</h3>
            <p className="text-sm text-muted-foreground">{workspaceDescription}</p>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </div>
        <StatSkeleton count={3} className="lg:grid-cols-3" />
        <TableRowSkeleton rows={5} columns={5} />
      </section>
    </AdminLoadingFrame>
  );
}
