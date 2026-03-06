import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveRequest } from '@/types/hrms';

import type { TimelineDisplayEvent } from '@/modules/leave/hooks/useLeaveRequestDetails';

interface ApprovalHistoryTabProps {
  request: LeaveRequest;
  events: TimelineDisplayEvent[];
  isLoading: boolean;
  formatDateTime: (value: string | null | undefined) => string;
  getActorLabel: (userId: string | null | undefined, fallbackLabel?: string | null) => string;
}

export function ApprovalHistoryTab({
  request,
  events,
  isLoading,
  formatDateTime,
  getActorLabel,
}: ApprovalHistoryTabProps) {
  const fallbackEvents = [
    {
      id: `submitted-${request.created_at}`,
      label: 'Submitted',
      at: request.created_at,
      by: request.employee_id,
      roleLabel: 'Requester',
      reason: null,
      subtext: null,
    },
    {
      id: `manager-${request.manager_approved_at}`,
      label: 'Manager Approved',
      at: request.manager_approved_at,
      by: request.manager_approved_by,
      roleLabel: 'Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `gm-${request.gm_approved_at}`,
      label: 'General Manager Approved',
      at: request.gm_approved_at,
      by: request.gm_approved_by,
      roleLabel: 'General Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `director-${request.director_approved_at}`,
      label: 'Director Approved',
      at: request.director_approved_at,
      by: request.director_approved_by,
      roleLabel: 'Director',
      reason: null,
      subtext: null,
    },
    {
      id: `hr-${request.hr_approved_at}`,
      label: 'Legacy HR Approved',
      at: request.hr_approved_at,
      by: request.hr_approved_by,
      roleLabel: 'HR',
      reason: null,
      subtext: null,
    },
    {
      id: `final-${request.final_approved_at}`,
      label: 'Final Approval',
      at: request.final_approved_at,
      by: request.final_approved_by,
      roleLabel: request.final_approved_by_role || 'Final Approver',
      reason: null,
      subtext: null,
    },
    {
      id: `rejected-${request.rejected_at}`,
      label: 'Rejected',
      at: request.rejected_at,
      by: request.rejected_by,
      roleLabel: 'Approver',
      reason: request.rejection_reason,
      subtext: null,
    },
  ].filter((event) => Boolean(event.at));

  const resolvedEvents = events.length > 0 ? events : fallbackEvents;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Approval History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? <p className="text-muted-foreground">Loading event history...</p> : null}
        {!isLoading && resolvedEvents.length === 0 ? (
          <p className="text-muted-foreground">This request has not been finalized yet.</p>
        ) : null}
        {resolvedEvents.map((event) => (
          <div key={event.id} className="rounded-lg border bg-muted/50 px-3 py-2">
            <p className="font-medium">{event.label}</p>
            <p className="text-muted-foreground">
              {formatDateTime(event.at)} by {getActorLabel(event.by, event.roleLabel)}
            </p>
            {event.subtext ? <p className="mt-1 text-muted-foreground">{event.subtext}</p> : null}
            {event.reason ? <p className="mt-1 text-muted-foreground">{event.reason}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
