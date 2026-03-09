import { Loader2 } from 'lucide-react';

import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { cn } from '@/lib/utils';

interface RouteLoadingStateProps {
  title?: string;
  description?: string;
  fullScreen?: boolean;
  className?: string;
}

export function RouteLoadingState({
  title = 'Loading workspace',
  description = 'Preparing the latest data, permissions, and interface state.',
  fullScreen = false,
  className,
}: RouteLoadingStateProps) {
  const panel = (
    <WorkspaceStatePanel
      title={title}
      description={description}
      icon={Loader2}
      animateIcon
      appearance="default"
      className={cn('w-full', className)}
    />
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">{panel}</div>
      </div>
    );
  }

  return panel;
}
