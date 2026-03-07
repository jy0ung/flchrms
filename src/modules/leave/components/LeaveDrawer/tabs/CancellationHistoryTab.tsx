import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import type { ActivityTimelineItem } from '@/components/activity/types';
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
  const fallbackEvents: TimelineDisplayEvent[] = [
    {
      id: `cancel-requested-${request.cancellation_requested_at}`,
      label: 'Cancellation Requested',
      at: request.cancellation_requested_at,
      kind: 'approval',
      by: request.cancellation_requested_by,
      roleLabel: 'Requester',
      reason: request.cancellation_reason,
      subtext: null,
    },
    {
      id: `cancel-manager-${request.cancellation_manager_approved_at}`,
      label: 'Cancellation Manager Approved',
      at: request.cancellation_manager_approved_at,
      kind: 'approval',
      by: request.cancellation_manager_approved_by,
      roleLabel: 'Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-gm-${request.cancellation_gm_approved_at}`,
      label: 'Cancellation GM Approved',
      at: request.cancellation_gm_approved_at,
      kind: 'approval',
      by: request.cancellation_gm_approved_by,
      roleLabel: 'General Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-director-${request.cancellation_director_approved_at}`,
      label: 'Cancellation Director Approved',
      at: request.cancellation_director_approved_at,
      kind: 'approval',
      by: request.cancellation_director_approved_by,
      roleLabel: 'Director',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-final-${request.cancellation_final_approved_at}`,
      label: 'Cancellation Final Approval',
      at: request.cancellation_final_approved_at,
      kind: 'approval',
      by: request.cancellation_final_approved_by,
      roleLabel: request.cancellation_final_approved_by_role || 'Final Approver',
      reason: null,
      subtext: null,
    },
    {
      id: `cancel-rejected-${request.cancellation_rejected_at}`,
      label: 'Cancellation Rejected',
      at: request.cancellation_rejected_at,
      kind: 'rejection',
      by: request.cancellation_rejected_by,
      roleLabel: 'Approver',
      reason: request.cancellation_rejection_reason,
      subtext: null,
    },
    {
      id: `cancelled-${request.cancelled_at}`,
      label: 'Leave Marked Cancelled',
      at: request.cancelled_at,
      kind: 'status_change',
      by: request.cancelled_by,
      roleLabel: request.cancelled_by_role || 'System',
      reason: null,
      subtext: null,
    },
  ].filter((event) => Boolean(event.at));

  const resolvedEvents = events.length > 0 ? events : fallbackEvents;
  const timelineItems: ActivityTimelineItem[] = resolvedEvents.map((event) => ({
    id: event.id,
    at: event.at,
    title: event.label,
    actorLabel: getActorLabel(event.by, event.roleLabel),
    description: [event.subtext, event.reason].filter(Boolean).join(' ') || null,
    kind: event.kind,
  }));

  return (
    <ActivityTimeline
      items={timelineItems}
      isLoading={isLoading}
      title="Cancellation History"
      emptyMessage="No cancellation request history recorded."
      formatTimestamp={formatDateTime}
    />
  );
}
