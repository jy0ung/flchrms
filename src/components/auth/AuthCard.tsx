import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBrandingContext } from '@/contexts/BrandingContext';

export type AuthFlowStage = 'credentials' | 'recovery' | 'two_factor';

interface AuthCardProps {
  stage: AuthFlowStage;
  children: ReactNode;
  className?: string;
}

const STAGE_DESCRIPTIONS: Record<AuthFlowStage, string> = {
  credentials: 'Sign in',
  recovery: 'Set a new password',
  two_factor: 'Verify sign in',
};

export function AuthCard({ stage, children, className }: AuthCardProps) {
  const { branding } = useBrandingContext();

  return (
    <Card className={cn('border-border/70 bg-background/95 shadow-xl shadow-black/5 backdrop-blur-sm', className)}>
      <CardHeader className="space-y-2 pb-6 text-center">
        {branding.logo_url ? (
          <div className="mb-1 flex justify-center">
            <img src={branding.logo_url} alt={branding.company_name} className="h-10 w-auto object-contain" />
          </div>
        ) : null}
        <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
          {branding.company_name}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          {STAGE_DESCRIPTIONS[stage]}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
