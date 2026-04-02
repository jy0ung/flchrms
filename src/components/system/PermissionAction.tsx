import * as React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionActionProps {
  allowed: boolean;
  reason: string;
  children: React.ReactElement<{
    disabled?: boolean;
    'aria-disabled'?: boolean;
    tabIndex?: number;
  }>;
}

export function PermissionAction({ allowed, reason, children }: PermissionActionProps) {
  if (allowed) return children;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-not-allowed" tabIndex={0} aria-label={reason}>
            {React.cloneElement(children, {
              disabled: true,
              'aria-disabled': true,
              tabIndex: -1,
            })}
          </span>
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
