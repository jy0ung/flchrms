import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { LeaveRequest } from '@/types/hrms';
import { toast } from 'sonner';

type LeaveRequestEventRow = Database['public']['Tables']['leave_request_events']['Row'];

type LeaveActorRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

type DetailActorsById = Record<string, LeaveActorRecord>;

export type TimelineDisplayEvent = {
  id: string;
  label: string;
  at: string;
  by?: string | null;
  roleLabel?: string | null;
  reason?: string | null;
  subtext?: string | null;
};

const roleLabelFromValue = (value: string | null | undefined) => {
  if (!value) return null;

  if (value === 'general_manager') return 'General Manager';
  if (value === 'manager') return 'Manager';
  if (value === 'director') return 'Director';
  if (value === 'hr') return 'HR';
  if (value === 'admin') return 'Admin';
  if (value === 'employee') return 'Requester';
  return value;
};

const leaveStatusLabelFromValue = (value: string | null | undefined) => {
  if (!value) return null;

  const statusLabelMap: Record<string, string> = {
    pending: 'Pending',
    manager_approved: 'Manager Approved',
    gm_approved: 'General Manager Approved',
    director_approved: 'Director Approved',
    hr_approved: 'HR Approved (Legacy)',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };

  return statusLabelMap[value] || value;
};

const cancellationStatusLabelFromValue = (value: string | null | undefined) => {
  if (!value) return null;

  const statusLabelMap: Record<string, string> = {
    pending: 'Cancellation Pending',
    manager_approved: 'Cancellation Manager Approved',
    gm_approved: 'Cancellation GM Approved',
    director_approved: 'Cancellation Director Approved',
    approved: 'Cancellation Approved',
    rejected: 'Cancellation Rejected',
  };

  return statusLabelMap[value] || value;
};

const getEventMetadataRecord = (event: LeaveRequestEventRow) => {
  if (!event.metadata || Array.isArray(event.metadata) || typeof event.metadata !== 'object') {
    return {} as Record<string, unknown>;
  }

  return event.metadata as Record<string, unknown>;
};

const getEventMetadataString = (event: LeaveRequestEventRow, key: string) => {
  const value = getEventMetadataRecord(event)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const buildDetailTimelineEvent = (event: LeaveRequestEventRow): TimelineDisplayEvent | null => {
  const base: TimelineDisplayEvent = {
    id: event.id,
    label: event.event_type,
    at: event.occurred_at,
    by: event.actor_user_id,
    roleLabel: roleLabelFromValue(event.actor_role),
    reason: null,
    subtext: null,
  };

  switch (event.event_type) {
    case 'leave_created':
      return { ...base, label: 'Submitted', roleLabel: base.roleLabel || 'Requester' };
    case 'leave_resubmitted':
      return {
        ...base,
        label: 'Resubmitted',
        roleLabel: base.roleLabel || 'Requester',
        reason: getEventMetadataString(event, 'amendment_notes'),
      };
    case 'leave_amended':
      return {
        ...base,
        label: 'Amended',
        roleLabel: base.roleLabel || 'Requester',
        reason: getEventMetadataString(event, 'amendment_notes'),
      };
    case 'leave_document_requested':
      return {
        ...base,
        label: 'Document Requested',
        reason: getEventMetadataString(event, 'manager_comments'),
      };
    case 'leave_document_attached':
      return { ...base, label: 'Document Attached', roleLabel: base.roleLabel || 'Requester' };
    case 'leave_rejected':
      return {
        ...base,
        label: 'Rejected',
        roleLabel: base.roleLabel || 'Approver',
        reason: getEventMetadataString(event, 'rejection_reason'),
      };
    case 'leave_final_approved':
      return {
        ...base,
        label: 'Final Approval',
        roleLabel: base.roleLabel || roleLabelFromValue(getEventMetadataString(event, 'final_approved_by_role')) || 'Final Approver',
      };
    case 'leave_status_changed': {
      const toStatusLabel = leaveStatusLabelFromValue(event.to_status);
      const fromStatusLabel = leaveStatusLabelFromValue(event.from_status);
      return {
        ...base,
        label: toStatusLabel ? `Status: ${toStatusLabel}` : 'Status Changed',
        subtext: fromStatusLabel && toStatusLabel ? `${fromStatusLabel} -> ${toStatusLabel}` : null,
      };
    }
    case 'leave_cancellation_requested':
      return {
        ...base,
        label: 'Cancellation Requested',
        roleLabel: base.roleLabel || 'Requester',
        reason: getEventMetadataString(event, 'cancellation_reason'),
      };
    case 'leave_cancellation_re_requested':
      return {
        ...base,
        label: 'Cancellation Re-requested',
        roleLabel: base.roleLabel || 'Requester',
        reason: getEventMetadataString(event, 'cancellation_reason'),
      };
    case 'leave_cancellation_stage_approved':
      return {
        ...base,
        label: cancellationStatusLabelFromValue(event.to_cancellation_status) || 'Cancellation Stage Approved',
        roleLabel: base.roleLabel || 'Approver',
      };
    case 'leave_cancellation_approved':
      return {
        ...base,
        label: 'Cancellation Approved',
        roleLabel: base.roleLabel || 'Approver',
        reason: getEventMetadataString(event, 'cancellation_reason'),
      };
    case 'leave_cancellation_rejected':
      return {
        ...base,
        label: 'Cancellation Rejected',
        roleLabel: base.roleLabel || 'Approver',
        reason: getEventMetadataString(event, 'cancellation_rejection_reason'),
      };
    default:
      return base;
  }
};

const collectActorIds = (request: LeaveRequest, eventRows: LeaveRequestEventRow[]) =>
  Array.from(new Set([
    request.employee_id,
    request.manager_approved_by,
    request.gm_approved_by,
    request.director_approved_by,
    request.hr_approved_by,
    request.final_approved_by,
    request.rejected_by,
    request.cancellation_requested_by,
    request.cancellation_manager_approved_by,
    request.cancellation_gm_approved_by,
    request.cancellation_director_approved_by,
    request.cancellation_final_approved_by,
    request.cancellation_rejected_by,
    request.cancelled_by,
    ...eventRows.map((event) => event.actor_user_id).filter((id): id is string => !!id),
  ].filter((id): id is string => !!id)));

export function useLeaveRequestDetailsDialog() {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [events, setEvents] = useState<LeaveRequestEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [actorsLoading, setActorsLoading] = useState(false);
  const [actorsById, setActorsById] = useState<DetailActorsById>({});

  const getActorLabel = (userId: string | null | undefined, fallbackLabel?: string | null) => {
    if (!userId) return fallbackLabel || '—';

    const actor = actorsById[userId];
    if (!actor) return fallbackLabel ? `${userId} (${fallbackLabel})` : userId;

    const name = `${actor.first_name || ''} ${actor.last_name || ''}`.trim();
    if (name) return fallbackLabel ? `${name} (${fallbackLabel})` : name;
    return fallbackLabel ? `${actor.email} (${fallbackLabel})` : actor.email;
  };

  const openDetails = async (nextRequest: LeaveRequest) => {
    setRequest(nextRequest);
    setEvents([]);
    setActorsById({});
    setOpen(true);

    setEventsLoading(true);
    const { data: eventRows, error: eventsError } = await supabase
      .from('leave_request_events')
      .select('id, leave_request_id, event_type, occurred_at, actor_user_id, actor_role, from_status, to_status, from_cancellation_status, to_cancellation_status, metadata, created_at')
      .eq('leave_request_id', nextRequest.id)
      .order('occurred_at', { ascending: true })
      .order('created_at', { ascending: true });
    setEventsLoading(false);

    if (eventsError) {
      toast.error(`Failed to load leave event history: ${eventsError.message}`);
    } else {
      setEvents((eventRows || []) as LeaveRequestEventRow[]);
    }

    const actorIds = collectActorIds(nextRequest, (eventRows || []) as LeaveRequestEventRow[]);
    if (actorIds.length === 0) {
      setActorsById({});
      return;
    }

    setActorsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', actorIds);
    setActorsLoading(false);

    if (error) {
      toast.error(`Failed to load leave details: ${error.message}`);
      return;
    }

    const nextMap: DetailActorsById = {};
    (data || []).forEach((actor) => {
      nextMap[actor.id] = actor;
    });
    setActorsById(nextMap);
  };

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setRequest(null);
      setActorsById({});
    }
  };

  const timelineEvents = useMemo(
    () => events.map(buildDetailTimelineEvent).filter((event): event is TimelineDisplayEvent => !!event),
    [events],
  );

  const approvalTimelineEvents = useMemo(
    () =>
      timelineEvents.filter((event) => {
        const source = events.find((row) => row.id === event.id);
        if (!source) return false;
        if (source.event_type.startsWith('leave_cancellation_')) return false;
        if (source.event_type === 'leave_status_changed' && source.to_status === 'cancelled') return false;
        return true;
      }),
    [timelineEvents, events],
  );

  const cancellationTimelineEvents = useMemo(
    () =>
      timelineEvents.filter((event) => {
        const source = events.find((row) => row.id === event.id);
        if (!source) return false;
        return source.event_type.startsWith('leave_cancellation_')
          || (source.event_type === 'leave_status_changed' && source.to_status === 'cancelled');
      }),
    [timelineEvents, events],
  );

  return {
    detailDialogOpen: open,
    detailRequest: request,
    detailEventsLoading: eventsLoading,
    detailActorsLoading: actorsLoading,
    detailApprovalTimelineEvents: approvalTimelineEvents,
    detailCancellationTimelineEvents: cancellationTimelineEvents,
    getActorLabel,
    handleOpenDetails: openDetails,
    handleDetailDialogOpenChange: onOpenChange,
  };
}
