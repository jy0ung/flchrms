import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ADMIN_WORKSPACE_BRIDGE_LIST } from '@/components/admin/admin-workspace-bridges';
import { PageHeader } from '@/components/system';

interface QuickAction {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bg: string;
  capability: AdminCapabilityKey;
  destination: string;
  surface: 'Workspace' | 'Admin';
}

export default function AdminQuickActionsPage() {
  usePageTitle('Admin · Quick Actions');

  const navigate = useNavigate();
  const { role } = useAuth();
  const { capabilityMap, capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);

  if (capabilitiesLoading) {
    return null;
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
      surface: 'Admin',
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
      surface: 'Admin',
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
      surface: 'Admin',
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
      surface: 'Admin',
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
      surface: 'Admin',
    },
  ];

  const visibleQuickActions = quickActions.filter((action) => capabilityMap[action.capability]);
  const workspaceActions = visibleQuickActions.filter((action) => action.surface === 'Workspace');
  const adminActions = visibleQuickActions.filter((action) => action.surface === 'Admin');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Actions"
        description="Choose the right operational workspace or governance surface for the task at hand."
      />

      {[
        {
          id: 'workspace-section',
          title: 'Operational Workspaces',
          description: 'Go directly to the modules where records are viewed, updated, and processed.',
          icon: Compass,
          actions: workspaceActions,
        },
        {
          id: 'admin-section',
          title: 'Governance Controls',
          description: 'Use the admin shell for policy, configuration, audit, and system controls.',
          icon: Shield,
          actions: adminActions,
        },
      ].filter((section) => section.actions.length > 0).map((section) => (
        <section key={section.id} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <section.icon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold sm:text-base">{section.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.actions.map((action) => (
              <Card
                key={action.id}
                className="cursor-pointer border-border shadow-sm transition-all hover:border-primary/20 hover:shadow-md active:scale-[0.98]"
                onClick={() => navigate(action.destination)}
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg}`}>
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
                      {action.surface}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold">{action.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
