import type { ComponentType } from 'react';
import {
  Compass,
  FileText,
  History,
  Megaphone,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminCapabilityKey } from '@/lib/admin-capabilities';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminQuickActionsLoadingSkeleton } from '@/components/admin/AdminLoadingSkeletons';
import { ADMIN_WORKSPACE_BRIDGE_LIST } from '@/components/admin/admin-workspace-bridges';
import { ActionTile, ContextChip } from '@/components/system';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { UtilityLayout } from '@/layouts/UtilityLayout';
import { SHELL_LABELS } from '@/lib/navigation-labels';

interface QuickAction {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bg: string;
  capability: AdminCapabilityKey;
  destination: string;
  surface: 'Workspace' | 'Governance';
}

export default function AdminQuickActionsPage() {
  usePageTitle(`Admin · ${SHELL_LABELS.governanceHub}`);

  const { role } = useAuth();
  const { capabilityMap, capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);

  if (capabilitiesLoading) {
    return (
      <UtilityLayout
        eyebrow="Governance"
        title={SHELL_LABELS.governanceHub}
        description="Launch the right workspace or governance control without leaving the admin shell."
        metaSlot={(
          <>
            <ContextChip tone="info">Scope: governance entry</ContextChip>
            <ContextChip>Mode: workspace launcher</ContextChip>
          </>
        )}
      >
        <AdminQuickActionsLoadingSkeleton
          title="Loading governance hub"
          description="Checking available governance actions and workspace routes for your account."
        />
      </UtilityLayout>
    );
  }

  if (!capabilities.canViewAdminQuickActions) {
    return (
      <AdminAccessDenied
        title="Quick actions are disabled"
        description="Your account does not have the capability to view admin quick actions."
      />
    );
  }

  const quickActions: QuickAction[] = [
    ...ADMIN_WORKSPACE_BRIDGE_LIST.map((bridge) => ({
      id: bridge.id,
      icon: bridge.icon,
      title: bridge.quickActionTitle,
      description: bridge.quickActionDescription,
      color: bridge.quickActionColor,
      bg: bridge.quickActionBg,
      capability: bridge.capability,
      destination: bridge.destination,
      surface: 'Workspace' as const,
    })),
    {
      id: 'manage-roles',
      icon: Shield,
      title: 'Manage Roles',
      description: 'Review and update role assignments, authority tiers, and capability policy.',
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      capability: 'manage_roles',
      destination: '/admin/roles',
      surface: 'Governance',
    },
    {
      id: 'leave-policies',
      icon: FileText,
      title: 'Leave Policies',
      description: 'Maintain leave types, policy configuration, and workflow builders.',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 dark:bg-cyan-950/50',
      capability: 'manage_leave_policies',
      destination: '/admin/leave-policies',
      surface: 'Governance',
    },
    {
      id: 'announcements',
      icon: Megaphone,
      title: 'Announcements',
      description: 'Create and manage company-wide announcements and communication content.',
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      capability: 'manage_announcements',
      destination: '/admin/announcements',
      surface: 'Governance',
    },
    {
      id: 'audit-log',
      icon: History,
      title: 'Audit Log',
      description: 'Inspect administrative changes, workflow events, and governance history.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      capability: 'view_admin_audit_log',
      destination: '/admin/audit-log',
      surface: 'Governance',
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'System Settings',
      description: 'Configure branding, environment settings, and admin-level platform behavior.',
      color: 'text-slate-600',
      bg: 'bg-slate-100 dark:bg-slate-900/50',
      capability: 'manage_admin_settings',
      destination: '/admin/settings',
      surface: 'Governance',
    },
  ];

  const visibleQuickActions = quickActions.filter((action) => capabilityMap[action.capability]);
  const workspaceActions = visibleQuickActions.filter((action) => action.surface === 'Workspace');
  const adminActions = visibleQuickActions.filter((action) => action.surface === 'Governance');
  const summaryItems: SummaryRailItem[] = [
    {
      id: 'workspace-count',
      label: 'Operational workspaces',
      value: workspaceActions.length,
      helper: 'Canonical module workspaces available from this governance hub.',
    },
    {
      id: 'governance-count',
      label: 'Governance controls',
      value: adminActions.length,
      helper: 'Policy, audit, communication, and configuration surfaces in scope.',
    },
    {
      id: 'total-routes',
      label: 'Available launch points',
      value: visibleQuickActions.length,
      helper: 'Governance destinations filtered to your current admin capabilities.',
    },
  ];

  return (
    <UtilityLayout
      eyebrow="Governance"
      title={SHELL_LABELS.governanceHub}
      description="Launch the right workspace or governance control without leaving the admin shell."
      metaSlot={(
        <>
          <ContextChip tone="info">Scope: governance entry</ContextChip>
          <ContextChip>Mode: workspace launcher</ContextChip>
        </>
      )}
      leadSlot={(
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current workspace
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Governance hub and workspace launcher
            </h2>
            <p className="text-sm text-muted-foreground">
              Start with the operational workspace that matches the task at hand, then move into policy, audit, or system-control surfaces when governance action is required.
            </p>
          </section>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Governance pattern
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Workspaces first, controls second
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use module workspaces for day-to-day operations. Open governance controls when you need to adjust policy, audit history, communications, or platform settings.
            </p>
          </div>
        </div>
      )}
      summarySlot={<SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />}
      supportingSlot={(
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Governance notes
          </p>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-medium text-foreground">Launch with the right level of authority</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Operational workspaces preserve record-level context. Governance controls are better suited to policy review, audit oversight, and system-wide updates.
            </p>
          </div>
        </section>
      )}
      supportingSurface="none"
    >
      <section className="space-y-6">

      {[
        {
          id: 'workspace-section',
          title: 'Operational Workspaces',
          description: 'Go straight to the modules where operational work happens.',
          icon: Compass,
          actions: workspaceActions,
        },
        {
          id: 'admin-section',
          title: 'Governance Controls',
          description: 'Open policy, audit, communication, and system-control surfaces.',
          icon: Shield,
          actions: adminActions,
        },
      ].filter((section) => section.actions.length > 0).map((section) => (
        <section key={section.id} className="space-y-2.5">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-x-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <section.icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold sm:text-base">{section.title}</h2>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div className="hidden lg:block" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.actions.map((action) => (
              <ActionTile
                key={action.id}
                to={action.destination}
                title={action.title}
                description={action.description}
                icon={action.icon}
                iconClassName={action.color}
                iconSurfaceClassName={action.bg}
                badgeLabel={action.surface}
                size="compact"
              />
            ))}
          </div>
        </section>
      ))}
      </section>
    </UtilityLayout>
  );
}
