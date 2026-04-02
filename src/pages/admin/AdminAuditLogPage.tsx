import { useMemo } from 'react';
import { History, User } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedFrom } from '@/integrations/supabase/untyped-client';
import { useEmployees } from '@/hooks/useEmployees';
import { useWorkflowConfigEvents } from '@/hooks/useWorkflowConfigEvents';
import { AdminTableLoadingSkeleton } from '@/components/admin/AdminLoadingSkeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { ContextChip, TableRowSkeleton, TaskEmptyState } from '@/components/system';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { UtilityLayout } from '@/layouts/UtilityLayout';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
}

interface AnnouncementAuditRow {
  id: string;
  announcement_id: string;
  action: 'create' | 'update' | 'delete';
  reason: string;
  old_values: {
    title?: string | null;
  } | null;
  new_values: {
    title?: string | null;
  } | null;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}

interface BrandingAuditRow {
  id: string;
  branding_id: string;
  reason: string;
  old_values: {
    company_name?: string | null;
  } | null;
  new_values: {
    company_name?: string | null;
  } | null;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}

interface UserRoleAuditRow {
  id: string;
  user_id: string;
  action: 'assign' | 'update' | 'remove';
  old_role: string | null;
  new_role: string | null;
  reason: string;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}

interface TenantSettingsAuditRow {
  id: string;
  settings_id: string;
  reason: string;
  old_values: {
    maintenance_mode?: boolean | null;
    session_timeout_minutes?: number | null;
  } | null;
  new_values: {
    maintenance_mode?: boolean | null;
    session_timeout_minutes?: number | null;
  } | null;
  changed_by: string;
  changed_by_role: string | null;
  changed_at: string;
}

function humanizeWorkflowToken(value: string | null | undefined, fallback: string) {
  return (value ?? fallback).replace(/_/g, ' ');
}

function useAuditLog() {
  const { data: employees } = useEmployees();
  const { data: workflowEvents, isLoading: workflowLoading } = useWorkflowConfigEvents(50);

  // Query recent leave request status changes
  const { data: recentLeaves, isLoading: leavesLoading } = useQuery({
    queryKey: ['admin-audit-leaves'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from('leave_requests')
        .select('id, employee_id, leave_type_id, status, updated_at, created_at')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Query recently updated profiles
  const { data: recentProfiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-audit-profiles'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, updated_at')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: announcementAudits, isLoading: announcementsLoading } = useQuery({
    queryKey: ['admin-audit-announcements'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await untypedFrom('announcement_audit_log')
        .select('*')
        .gte('changed_at', thirtyDaysAgo.toISOString())
        .order('changed_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data ?? []) as AnnouncementAuditRow[];
    },
    staleTime: 60_000,
  });

  const { data: brandingAudits, isLoading: brandingLoading } = useQuery({
    queryKey: ['admin-audit-branding'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await untypedFrom('tenant_branding_audit_log')
        .select('*')
        .gte('changed_at', thirtyDaysAgo.toISOString())
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as BrandingAuditRow[];
    },
    staleTime: 60_000,
  });

  const { data: roleAudits, isLoading: roleAuditLoading } = useQuery({
    queryKey: ['admin-audit-user-roles'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await untypedFrom('user_role_audit_log')
        .select('*')
        .gte('changed_at', thirtyDaysAgo.toISOString())
        .order('changed_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data ?? []) as UserRoleAuditRow[];
    },
    staleTime: 60_000,
  });

  const { data: tenantSettingsAudits, isLoading: tenantSettingsAuditLoading } = useQuery({
    queryKey: ['admin-audit-tenant-settings'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await untypedFrom('tenant_settings_audit_log')
        .select('*')
        .gte('changed_at', thirtyDaysAgo.toISOString())
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as TenantSettingsAuditRow[];
    },
    staleTime: 60_000,
  });

  const isLoading = workflowLoading || leavesLoading || profilesLoading || announcementsLoading || brandingLoading || roleAuditLoading || tenantSettingsAuditLoading;

  const entries = useMemo((): AuditEntry[] => {
    const empMap = new Map(
      (employees ?? []).map((e) => [e.id, `${e.first_name} ${e.last_name}`]),
    );

    const result: AuditEntry[] = [];

    // Workflow audit entries
    for (const entry of workflowEvents ?? []) {
      const actorName = entry.actor
        ? `${entry.actor.first_name} ${entry.actor.last_name}`.trim()
        : 'System';
      const workflowType = humanizeWorkflowToken(entry.workflow_type, 'workflow');
      const actionType = humanizeWorkflowToken(entry.action, 'updated');

      result.push({
        id: `wf-${entry.id}`,
        timestamp: entry.created_at,
        actor: actorName,
        action: 'Workflow Config Change',
        target: entry.department_id ? `Department workflow` : 'Default workflow',
        details: `${workflowType}: ${actionType}`,
      });
    }

    // Leave request changes
    for (const lr of recentLeaves ?? []) {
      result.push({
        id: `lr-${lr.id}`,
        timestamp: lr.updated_at ?? lr.created_at,
        actor: empMap.get(lr.employee_id) ?? lr.employee_id,
        action: 'Leave Request',
        target: `Status: ${lr.status}`,
        details: `Leave request ${lr.status}`,
      });
    }

    // Profile updates
    for (const prof of recentProfiles ?? []) {
      result.push({
        id: `prof-${prof.id}`,
        timestamp: prof.updated_at,
        actor: `${prof.first_name} ${prof.last_name}`,
        action: 'Profile Update',
        target: `${prof.first_name} ${prof.last_name}`,
        details: 'Employee profile modified',
      });
    }

    // Announcement governance changes
    for (const audit of announcementAudits ?? []) {
      const announcementTitle = audit.new_values?.title ?? audit.old_values?.title ?? 'Announcement';
      result.push({
        id: `ann-${audit.id}`,
        timestamp: audit.changed_at,
        actor: empMap.get(audit.changed_by) ?? audit.changed_by,
        action: 'Announcement Change',
        target: `${humanizeWorkflowToken(audit.action, 'updated')}: ${announcementTitle}`,
        details: audit.reason,
      });
    }

    for (const audit of brandingAudits ?? []) {
      const companyName = audit.new_values?.company_name ?? audit.old_values?.company_name ?? 'Tenant branding';
      result.push({
        id: `branding-${audit.id}`,
        timestamp: audit.changed_at,
        actor: empMap.get(audit.changed_by) ?? audit.changed_by,
        action: 'Branding Change',
        target: companyName,
        details: audit.reason,
      });
    }

    for (const audit of roleAudits ?? []) {
      const targetUser = empMap.get(audit.user_id) ?? audit.user_id;
      const nextRole = audit.new_role ? humanizeWorkflowToken(audit.new_role, 'role') : 'employee fallback';
      result.push({
        id: `role-${audit.id}`,
        timestamp: audit.changed_at,
        actor: empMap.get(audit.changed_by) ?? audit.changed_by,
        action: 'Role Assignment Change',
        target: `${targetUser}`,
        details: `${humanizeWorkflowToken(audit.action, 'update')} -> ${nextRole}: ${audit.reason}`,
      });
    }

    for (const audit of tenantSettingsAudits ?? []) {
      const maintenanceMode = audit.new_values?.maintenance_mode;
      const timeoutMinutes = audit.new_values?.session_timeout_minutes;
      const targetParts = [
        typeof maintenanceMode === 'boolean'
          ? `maintenance ${maintenanceMode ? 'on' : 'off'}`
          : null,
        typeof timeoutMinutes === 'number' ? `timeout ${timeoutMinutes} min` : null,
      ].filter(Boolean);

      result.push({
        id: `tenant-settings-${audit.id}`,
        timestamp: audit.changed_at,
        actor: empMap.get(audit.changed_by) ?? audit.changed_by,
        action: 'Tenant Settings Change',
        target: targetParts.join(' · ') || 'Tenant platform defaults',
        details: audit.reason,
      });
    }

    // Sort by timestamp, newest first
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result.slice(0, 100);
  }, [employees, workflowEvents, recentLeaves, recentProfiles, announcementAudits, brandingAudits, roleAudits, tenantSettingsAudits]);

  return { entries, isLoading };
}

const ACTION_COLORS: Record<string, string> = {
  'Workflow Config Change': 'bg-violet-50 text-violet-700 border-violet-200',
  'Leave Request': 'bg-blue-50 text-blue-700 border-blue-200',
  'Profile Update': 'bg-green-50 text-green-700 border-green-200',
  'Announcement Change': 'bg-amber-50 text-amber-700 border-amber-200',
  'Branding Change': 'bg-sky-50 text-sky-700 border-sky-200',
  'Role Assignment Change': 'bg-rose-50 text-rose-700 border-rose-200',
  'Tenant Settings Change': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AdminAuditLogPage() {
  usePageTitle('Admin · Audit Log');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { entries, isLoading } = useAuditLog();
  const summaryItems = useMemo((): SummaryRailItem[] => {
    const workflowChanges = entries.filter((entry) => entry.action === 'Workflow Config Change').length;
    const leaveEvents = entries.filter((entry) => entry.action === 'Leave Request').length;
    const announcementChanges = entries.filter((entry) => entry.action === 'Announcement Change').length;
    const brandingChanges = entries.filter((entry) => entry.action === 'Branding Change').length;
    const roleChanges = entries.filter((entry) => entry.action === 'Role Assignment Change').length;
    const tenantSettingsChanges = entries.filter((entry) => entry.action === 'Tenant Settings Change').length;

    return [
      {
        id: 'review-window',
        label: 'Review window',
        value: '30 days',
        helper: 'Governance history currently summarized across the last 30 days.',
      },
      {
        id: 'workflow-events',
        label: 'Workflow changes',
        value: workflowChanges,
        helper: 'Workflow configuration activity captured during the current review period.',
      },
      {
        id: 'leave-events',
        label: 'Leave events',
        value: leaveEvents,
        helper: 'Leave-request activity included in the governance review feed.',
      },
      {
        id: 'announcement-changes',
        label: 'Announcement changes',
        value: announcementChanges,
        helper: 'Published communication changes captured with governance reasons.',
      },
      {
        id: 'branding-changes',
        label: 'Branding changes',
        value: brandingChanges,
        helper: 'Tenant identity changes captured with governance reasons.',
      },
      {
        id: 'role-changes',
        label: 'Role changes',
        value: roleChanges,
        helper: 'Role assignment changes captured with operator reasons.',
      },
      {
        id: 'tenant-settings-changes',
        label: 'Tenant settings',
        value: tenantSettingsChanges,
        helper: 'Platform default changes captured with governance reasons.',
      },
    ];
  }, [entries]);

  if (capabilitiesLoading) {
    return (
      <UtilityLayout
        eyebrow="Governance"
        title="Audit Log"
        description="Recent system activity across workflows, leave requests, governed settings, and profile changes."
        metaSlot={(
          <>
            <ContextChip tone="info">Scope: governance review</ContextChip>
            <ContextChip>Mode: audit history</ContextChip>
          </>
        )}
      >
        <AdminTableLoadingSkeleton
          title="Loading audit log"
          description="Checking audit-log access and preparing the latest governance history."
          sectionTitle="Recent governance history"
          sectionDescription="Preparing workflow changes, leave activity, communication changes, branding updates, tenant setting changes, role changes, and profile updates from the last 30 days."
        />
      </UtilityLayout>
    );
  }

  if (!capabilities.canViewAdminAuditLog) {
    return (
      <AdminAccessDenied
        title="Audit log access is disabled"
        description="Your account does not have the capability to view audit log data."
      />
    );
  }

  return (
    <UtilityLayout
      eyebrow="Governance"
      title="Audit Log"
      description="Recent system activity across workflows, leave requests, announcement governance, branding changes, tenant settings, role changes, and profile changes."
      metaSlot={(
        <>
          <ContextChip tone="info">Scope: governance review</ContextChip>
          <ContextChip>Mode: audit history</ContextChip>
        </>
      )}
      leadSlot={(
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current workspace
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Governance review window and audit history
            </h2>
            <p className="text-sm text-muted-foreground">
              Review the latest workflow changes, leave activity, announcement changes, branding changes, tenant-setting changes, role changes, and profile updates in one ordered audit stream before you move into deeper investigation.
            </p>
          </section>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Review guidance
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Audit by sequence, then by target
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the newest events to identify emerging governance issues, then use the actor and target columns to trace the exact record or policy surface involved.
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
            <p className="text-sm font-medium text-foreground">Use audit history for verification</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The audit stream helps verify operational changes after the fact. Pair it with the live governance workspace when a record or policy needs active correction.
            </p>
          </div>
        </section>
      )}
      supportingSurface="none"
    >

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">Recent governance history</h2>
                <p className="text-sm text-muted-foreground">
                  Loading workflow, leave, announcement, branding, tenant settings, role, and profile activity for the current governance review window.
                </p>
              </div>
              <TableRowSkeleton rows={6} columns={5} />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-6">
              <TaskEmptyState
                title="No audit entries in the last 30 days"
                description="Recent workflow, profile, and governance activity will appear here once it is recorded."
                icon={History}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{entry.actor}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ACTION_COLORS[entry.action] ?? ''}>
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{entry.target}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                      {entry.details}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </UtilityLayout>
  );
}
