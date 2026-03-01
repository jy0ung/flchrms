import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  return (
    <Card className={cn('border-border shadow-sm', className)}>
      <CardHeader className="space-y-1 pb-4 text-center">
        <CardTitle className="text-xl font-semibold tracking-tight">FLC-HRMS</CardTitle>
        <CardDescription>{STAGE_DESCRIPTIONS[stage]}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
