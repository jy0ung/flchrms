import { useMemo } from 'react';
import { History, User } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hooks/useEmployees';
import { useWorkflowConfigEvents } from '@/hooks/useWorkflowConfigEvents';
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
import { PageHeader, RouteLoadingState, TaskEmptyState } from '@/components/system';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
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

  const isLoading = workflowLoading || leavesLoading || profilesLoading;

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
      const workflowType = entry.workflow_type.replace(/_/g, ' ');
      const eventType = entry.event_type.replace(/_/g, ' ');

      result.push({
        id: `wf-${entry.id}`,
        timestamp: entry.created_at,
        actor: actorName,
        action: 'Workflow Config Change',
        target: entry.department_id ? `Department workflow` : 'Default workflow',
        details: `${workflowType}: ${eventType}`,
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

    // Sort by timestamp, newest first
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result.slice(0, 100);
  }, [employees, workflowEvents, recentLeaves, recentProfiles]);

  return { entries, isLoading };
}

const ACTION_COLORS: Record<string, string> = {
  'Workflow Config Change': 'bg-violet-50 text-violet-700 border-violet-200',
  'Leave Request': 'bg-blue-50 text-blue-700 border-blue-200',
  'Profile Update': 'bg-green-50 text-green-700 border-green-200',
};

export default function AdminAuditLogPage() {
  usePageTitle('Admin · Audit Log');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { entries, isLoading } = useAuditLog();

  if (capabilitiesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Audit Log"
          description="Recent system activity across workflows, leave requests, and profile changes."
        />
        <RouteLoadingState
          title="Loading audit log"
          description="Checking audit-log access and preparing the latest governance history."
        />
      </div>
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
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Recent system activity across workflows, leave requests, and profile changes."
      />

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading audit entries...
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
    </div>
  );
}
