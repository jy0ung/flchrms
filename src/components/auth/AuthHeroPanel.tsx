import { ShieldCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { CardHeaderStandard } from '@/components/system';

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

        <CardHeaderStandard
          title="FLC-HRMS"
          description="Centralized HR management for leave workflows, payroll operations, employee records, and internal updates."
          className="mt-7 p-0 pb-2"
          titleClassName="text-4xl font-bold tracking-tight"
          descriptionClassName="max-w-md text-base leading-relaxed"
        />

        <div className="mt-8 grid gap-3">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="text-base font-semibold">Role-Based Access Controls</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Access is restricted by role, department, and workflow stage.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div>
              <p className="text-base font-semibold">Flexible Sign-In</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Sign in using email, username, or employee ID.
              </p>
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
