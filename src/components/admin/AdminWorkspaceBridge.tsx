import type { ReactNode } from 'react';

import { WorkspaceTransitionNotice } from '@/components/workspace/WorkspaceTransitionNotice';

import type { AdminWorkspaceBridgeDefinition } from './admin-workspace-bridges';

interface AdminWorkspaceBridgeProps {
  bridge: AdminWorkspaceBridgeDefinition;
  children: ReactNode;
}

export function AdminWorkspaceBridge({ bridge, children }: AdminWorkspaceBridgeProps) {
  return (
    <div className="space-y-4">
      <WorkspaceTransitionNotice
        title={bridge.title}
        description={bridge.description}
        destination={bridge.destination}
        actionLabel={bridge.actionLabel}
        supportingText={bridge.supportingText}
      />
      {children}
    </div>
  );
}
