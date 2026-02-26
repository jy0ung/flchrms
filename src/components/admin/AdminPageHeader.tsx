import { Shield } from 'lucide-react';

export function AdminPageHeader() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">HR Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage employee profiles, access roles, leave policies, and system operations.
          </p>
        </div>
      </div>
    </div>
  );
}
