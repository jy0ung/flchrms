import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeaveRequest } from '@/types/hrms';

import type { TimelineDisplayEvent } from '@/modules/leave/hooks/useLeaveRequestDetails';

interface CancellationHistoryTabProps {
  request: LeaveRequest;
  events: TimelineDisplayEvent[];
  isLoading: boolean;
  formatDateTime: (value: string | null | undefined) => string;
  getActorLabel: (userId: string | null | undefined, fallbackLabel?: string | null) => string;
}

export function CancellationHistoryTab({
  request,
  events,
  isLoading,
  formatDateTime,
  getActorLabel,
}: CancellationHistoryTabProps) {
  const fallbackEvents = [
    {
      id: `cancel-requested-${request.cancellation_requested_at}`,
      label: 'Cancellation Requested',
      at: request.cancellation_requested_at,
      by: request.cancellation_requested_by,
      roleLabel: 'Requester',
      reason: request.cancellation_reason,
      subtext: null,
    },
    {
      id: `cancel-manager-${request.cancellation_manager_approved_at}`,
      label: 'Cancellation Manager Approved',
      at: request.cancellation_manager_approved_at,
      by: request.cancellation_manager_approved_by,
      roleLabel: 'Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-gm-${request.cancellation_gm_approved_at}`,
      label: 'Cancellation GM Approved',
      at: request.cancellation_gm_approved_at,
      by: request.cancellation_gm_approved_by,
      roleLabel: 'General Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-director-${request.cancellation_director_approved_at}`,
      label: 'Cancellation Director Approved',
      at: request.cancellation_director_approved_at,
      by: request.cancellation_director_approved_by,
      roleLabel: 'Director',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-final-${request.cancellation_final_approved_at}`,
      label: 'Cancellation Final Approval',
      at: request.cancellation_final_approved_at,
      by: request.cancellation_final_approved_by,
      roleLabel: request.cancellation_final_approved_by_role || 'Final Approver',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-rejected-${request.cancellation_rejected_at}`,
      label: 'Cancellation Rejected',
      at: request.cancellation_rejected_at,
      by: request.cancellation_rejected_by,
      roleLabel: 'Approver',
      reason: request.cancellation_rejection_reason,
      subtext: null,
    },
    {
      id: `cancelled-${request.cancelled_at}`,
      label: 'Leave Marked Cancelled',
      at: request.cancelled_at,
      by: request.cancelled_by,
      roleLabel: request.cancelled_by_role || 'System',
      reason: null,
      subtext: null,
    },
  ].filter((event) => Boolean(event.at));

  const resolvedEvents = events.length > 0 ? events : fallbackEvents;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Cancellation History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? <p className="text-muted-foreground">Loading cancellation history...</p> : null}
        {!isLoading && resolvedEvents.length === 0 ? (
          <p className="text-muted-foreground">No cancellation request history recorded.</p>
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
