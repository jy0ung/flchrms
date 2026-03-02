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
  credentials: 'Sign in to your account',
  recovery: 'Reset your password',
  two_factor: 'Verify your identity',
};

export function AuthCard({ stage, children, className }: AuthCardProps) {
  const { branding } = useBrandingContext();

  return (
    <Card className={cn('border-border shadow-sm', className)}>
      <CardHeader className="space-y-1 pb-4 text-center">
        {branding.logo_url ? (
          <div className="flex justify-center mb-2">
            <img src={branding.logo_url} alt={branding.company_name} className="h-10 w-auto object-contain" />
          </div>
        ) : null}
        <CardTitle className="text-xl font-semibold tracking-tight">
          {branding.company_name}
        </CardTitle>
        <CardDescription>{STAGE_DESCRIPTIONS[stage]}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
