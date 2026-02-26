import { Shield } from 'lucide-react';

export function AdminPageHeader() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Shield className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">HR Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Manage employee profiles, access roles, leave policies, and system operations.
          </p>
        </div>
      </div>
    </div>
  );
}
