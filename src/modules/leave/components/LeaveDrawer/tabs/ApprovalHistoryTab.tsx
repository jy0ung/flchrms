import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import type { ActivityTimelineItem } from '@/components/activity/types';
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
  const fallbackEvents: TimelineDisplayEvent[] = [
    {
      id: `submitted-${request.created_at}`,
      label: 'Submitted',
      at: request.created_at,
      kind: 'create',
      by: request.employee_id,
      roleLabel: 'Requester',
      reason: null,
      subtext: null,
    },
    {
      id: `manager-${request.manager_approved_at}`,
      label: 'Manager Approved',
      at: request.manager_approved_at,
      kind: 'approval',
      by: request.manager_approved_by,
      roleLabel: 'Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `gm-${request.gm_approved_at}`,
      label: 'General Manager Approved',
      at: request.gm_approved_at,
      kind: 'approval',
      by: request.gm_approved_by,
      roleLabel: 'General Manager',
      reason: null,
      subtext: null,
    },
    {
      id: `director-${request.director_approved_at}`,
      label: 'Director Approved',
      at: request.director_approved_at,
      kind: 'approval',
      by: request.director_approved_by,
      roleLabel: 'Director',
      reason: null,
      subtext: null,
    },
    {
      id: `hr-${request.hr_approved_at}`,
      label: 'Legacy HR Approved',
      at: request.hr_approved_at,
      kind: 'approval',
      by: request.hr_approved_by,
      roleLabel: 'HR',
      reason: null,
      subtext: null,
    },
    {
      id: `final-${request.final_approved_at}`,
      label: 'Final Approval',
      at: request.final_approved_at,
      kind: 'approval',
      by: request.final_approved_by,
      roleLabel: request.final_approved_by_role || 'Final Approver',
      reason: null,
      subtext: null,
    },
    {
      id: `rejected-${request.rejected_at}`,
      label: 'Rejected',
      at: request.rejected_at,
      kind: 'rejection',
      by: request.rejected_by,
      roleLabel: 'Approver',
      reason: request.rejection_reason,
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
      title="Approval History"
      emptyMessage="This request has not been finalized yet."
      formatTimestamp={formatDateTime}
    />
  );
}
