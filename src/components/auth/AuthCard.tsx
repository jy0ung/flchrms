import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CardHeaderStandard } from '@/components/system';
import { cn } from '@/lib/utils';

export type AuthFlowStage = 'credentials' | 'recovery' | 'two_factor';

interface AuthCardProps {
  stage: AuthFlowStage;
  environmentLabel: string;
  securityContextLabel: string;
  children: ReactNode;
  className?: string;
}

const STAGE_LABELS: Record<AuthFlowStage, string> = {
  credentials: 'Credentials',
  recovery: 'Password Recovery',
  two_factor: 'Two-Factor Verification',
};

export function AuthCard({
  stage,
  environmentLabel,
  securityContextLabel,
  children,
  className,
}: AuthCardProps) {
  return (
    <Card
      className={cn(
        'h-full w-full border-border/60 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.03),0_18px_40px_hsl(var(--foreground)/0.07)]',
        className,
      )}
    >
      <CardHeaderStandard
        title="FLC-HRMS"
        description="Fook Loi Group HR Management System"
        className="space-y-0 pb-4 text-center [&>div]:items-center"
        titleClassName="text-2xl font-bold tracking-tight sm:text-3xl"
        descriptionClassName="text-sm"
      />
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 text-[11px] font-medium">
            Internal System Access
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 text-[11px] font-medium">
            {environmentLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 text-[11px] font-medium">
            {securityContextLabel}
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 text-[11px] font-medium">
            <Lock className="mr-1 h-3 w-3" />
            Stage: {STAGE_LABELS[stage]}
          </Badge>
        </div>
      </CardContent>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  );
}
