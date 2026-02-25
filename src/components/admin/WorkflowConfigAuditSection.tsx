import { useMemo, useState } from 'react';
import { Activity, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkflowConfigEvents, type WorkflowConfigEventWithActor } from '@/hooks/useWorkflowConfigEvents';
import type { Department } from '@/types/hrms';

type WorkflowAuditFilter = 'all' | 'leave_approval' | 'leave_cancellation';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStages(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const raw = value.approval_stages;
  if (!Array.isArray(raw)) return [];
  return raw.filter((stage): stage is string => typeof stage === 'string');
}

function stageLabel(stage: string) {
  if (stage === 'manager') return 'Manager';
  if (stage === 'general_manager') return 'General Manager';
  if (stage === 'director') return 'Director';
  return stage;
}

function routePreview(stages: string[]) {
  if (!stages.length) return 'No stages';
  return stages.map(stageLabel).join(' -> ');
}

function workflowTypeLabel(workflowType: string) {
  return workflowType === 'leave_cancellation' ? 'Cancellation' : 'Approval';
}

function actionBadgeClass(action: string) {
  if (action === 'created') return 'bg-green-500/15 text-green-700 border-green-500/20';
  if (action === 'updated') return 'bg-blue-500/15 text-blue-700 border-blue-500/20';
  if (action === 'deleted') return 'bg-red-500/15 text-red-700 border-red-500/20';
  return 'bg-muted text-muted-foreground';
}

function summarizeChange(event: WorkflowConfigEventWithActor) {
  const oldStages = parseStages(event.old_values);
  const newStages = parseStages(event.new_values);
  const oldPreview = routePreview(oldStages);
  const newPreview = routePreview(newStages);

  if (event.action === 'created') {
    return `Route: ${newPreview}`;
  }
  if (event.action === 'deleted') {
    return `Removed route: ${oldPreview}`;
  }
  if (oldPreview !== newPreview) {
    return `Route changed: ${oldPreview} -> ${newPreview}`;
  }

  const oldValues = isRecord(event.old_values) ? event.old_values : null;
  const newValues = isRecord(event.new_values) ? event.new_values : null;

  const changes: string[] = [];

  if (oldValues && newValues && oldValues.is_active !== newValues.is_active) {
    changes.push(`Active: ${String(oldValues.is_active)} -> ${String(newValues.is_active)}`);
  }

  if (oldValues && newValues && oldValues.notes !== newValues.notes) {
    changes.push('Notes updated');
  }

  return changes.length > 0 ? changes.join(' | ') : 'Workflow settings updated';
}

function WorkflowAuditItem({
  event,
  departments,
}: {
  event: WorkflowConfigEventWithActor;
  departments?: Department[];
}) {
  const actorName = event.actor
    ? `${event.actor.first_name} ${event.actor.last_name}`.trim()
    : 'System';
  const departmentName =
    event.department_id
      ? departments?.find((department) => department.id === event.department_id)?.name ?? 'Unknown Department'
      : 'All Departments (Default)';

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{workflowTypeLabel(event.workflow_type)}</Badge>
          <Badge variant="outline" className={actionBadgeClass(event.action)}>
            {event.action}
          </Badge>
          <Badge variant="secondary">{departmentName}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">
          {workflowTypeLabel(event.workflow_type)} workflow ({event.requester_role.replace('_', ' ')})
        </p>
        <p className="text-xs text-muted-foreground">
          {summarizeChange(event)}
        </p>
      </div>

      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        <span>
          By: <span className="font-medium text-foreground">{actorName}</span>
          {event.changed_by_role ? ` (${event.changed_by_role.replace('_', ' ')})` : ''}
        </span>
        {event.actor?.email && <span>Email: {event.actor.email}</span>}
      </div>
    </div>
  );
}

interface WorkflowConfigAuditSectionProps {
  departments?: Department[];
}

export function WorkflowConfigAuditSection({ departments }: WorkflowConfigAuditSectionProps) {
  const { data: events, isLoading, isFetching, refetch, error } = useWorkflowConfigEvents(30);
  const [filter, setFilter] = useState<WorkflowAuditFilter>('all');

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (filter === 'all') return events;
    return events.filter((event) => event.workflow_type === filter);
  }, [events, filter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Workflow Configuration Activity
            </CardTitle>
            <CardDescription>
              Recent approval and cancellation workflow changes for audit and supervision.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as WorkflowAuditFilter)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="leave_approval">Approval</TabsTrigger>
            <TabsTrigger value="leave_cancellation">Cancellation</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading workflow activity...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Failed to load workflow activity.
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No workflow configuration activity found.
          </div>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="space-y-3 pr-3">
              {filteredEvents.map((event) => (
                <WorkflowAuditItem key={event.id} event={event} departments={departments} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
