import { Shield } from 'lucide-react';

export function AdminPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="w-8 h-8 text-accent" />
          HR Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Manage employee profiles and system roles</p>
      </div>
    </div>
  );
}
