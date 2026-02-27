import { Building2, KeyRound, ShieldCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface AuthHeroPanelProps {
  environmentLabel: string;
  securityContextLabel: string;
}

export function AuthHeroPanel({ environmentLabel, securityContextLabel }: AuthHeroPanelProps) {
  return (
    <Card className="hidden h-full border-border/60 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.03),0_16px_36px_hsl(var(--foreground)/0.06)] lg:block">
      <CardContent className="flex h-full flex-col p-8 xl:p-10">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Internal system access · {environmentLabel} · {securityContextLabel}
        </div>

        <div className="mt-7 space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">FLC-HRMS</h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Centralized HR management for leave workflows, payroll operations, employee records, and internal updates.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-base font-semibold">Role-based access controls</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Access is restricted by role, department, and workflow stage.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-base font-semibold">Flexible sign-in</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Sign in using email, username, or employee ID.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-auto pt-6 text-xs text-muted-foreground">
          Internal enterprise workspace. Access is monitored and audited.
        </p>
      </CardContent>
    </Card>
  );
}
