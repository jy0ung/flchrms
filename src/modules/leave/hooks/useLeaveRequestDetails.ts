import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ActivityTimelineKind } from '@/components/activity/types';
import { supabase } from '@/integrations/supabase/client';
import { untypedFrom } from '@/integrations/supabase/untyped-client';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import type { LeaveRequest } from '@/types/hrms';

export interface LeaveRequestEventRow {
  id: string;
  leave_request_id: string;
  event_type: string;
  occurred_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  from_status: string | null;
  to_status: string | null;
  from_cancellation_status: string | null;
  to_cancellation_status: string | null;
  metadata: unknown;
  created_at: string;
}

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
  kind: ActivityTimelineKind;
  by?: string | null;
  roleLabel?: string | null;
  reason?: string | null;
  subtext?: string | null;
};

export function formatLeaveActorLabel(
  actor: LeaveActorRecord | undefined,
  userId: string | null | undefined,
  fallbackLabel?: string | null,
) {
  if (!userId) return fallbackLabel || '—';
  if (!actor) return fallbackLabel || userId;

  const name = `${actor.first_name || ''} ${actor.last_name || ''}`.trim();
  if (name) return fallbackLabel ? `${name} (${fallbackLabel})` : name;

  return fallbackLabel ? `${actor.email} (${fallbackLabel})` : actor.email;
}

interface UseLeaveRequestDetailsOptions {
  request: LeaveRequest | null;
  enabled?: boolean;
}

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
    kind: 'custom',
    by: event.actor_user_id,
    roleLabel: roleLabelFromValue(event.actor_role),
    reason: null,
    subtext: null,
  };

  switch (event.event_type) {
    case 'leave_created':
      return { ...base, label: 'Submitted', kind: 'create', roleLabel: base.roleLabel || 'Requester' };
    case 'leave_resubmitted':
      return { ...base, label: 'Resubmitted', kind: 'update', roleLabel: base.roleLabel || 'Requester', reason: getEventMetadataString(event, 'amendment_notes') };
    case 'leave_amended':
      return { ...base, label: 'Amended', kind: 'update', roleLabel: base.roleLabel || 'Requester', reason: getEventMetadataString(event, 'amendment_notes') };
    case 'leave_document_requested':
      return { ...base, label: 'Document Requested', kind: 'document', reason: getEventMetadataString(event, 'manager_comments') };
    case 'leave_document_attached':
      return { ...base, label: 'Document Attached', kind: 'document', roleLabel: base.roleLabel || 'Requester' };
    case 'leave_rejected':
      return { ...base, label: 'Rejected', kind: 'rejection', roleLabel: base.roleLabel || 'Approver', reason: getEventMetadataString(event, 'rejection_reason') };
    case 'leave_final_approved':
      return { ...base, label: 'Final Approval', kind: 'approval', roleLabel: base.roleLabel || roleLabelFromValue(getEventMetadataString(event, 'final_approved_by_role')) || 'Final Approver' };
    case 'leave_status_changed': {
      const toStatusLabel = leaveStatusLabelFromValue(event.to_status);
      const fromStatusLabel = leaveStatusLabelFromValue(event.from_status);
      return { ...base, label: toStatusLabel ? `Status: ${toStatusLabel}` : 'Status Changed', kind: 'status_change', subtext: fromStatusLabel && toStatusLabel ? `${fromStatusLabel} -> ${toStatusLabel}` : null };
    }
    case 'leave_cancellation_requested':
      return { ...base, label: 'Cancellation Requested', kind: 'approval', roleLabel: base.roleLabel || 'Requester', reason: getEventMetadataString(event, 'cancellation_reason') };
    case 'leave_cancellation_re_requested':
      return { ...base, label: 'Cancellation Re-requested', kind: 'update', roleLabel: base.roleLabel || 'Requester', reason: getEventMetadataString(event, 'cancellation_reason') };
    case 'leave_cancellation_stage_approved':
      return { ...base, label: cancellationStatusLabelFromValue(event.to_cancellation_status) || 'Cancellation Stage Approved', kind: 'approval', roleLabel: base.roleLabel || 'Approver' };
    case 'leave_cancellation_approved':
      return { ...base, label: 'Cancellation Approved', kind: 'approval', roleLabel: base.roleLabel || 'Approver', reason: getEventMetadataString(event, 'cancellation_reason') };
    case 'leave_cancellation_rejected':
      return { ...base, label: 'Cancellation Rejected', kind: 'rejection', roleLabel: base.roleLabel || 'Approver', reason: getEventMetadataString(event, 'cancellation_rejection_reason') };
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

export function useLeaveRequestDetails({ request, enabled = true }: UseLeaveRequestDetailsOptions) {
  const requestId = request?.id ?? null;

  const eventsQuery = useQuery({
    queryKey: ['leave-request-details', 'events', requestId],
    enabled: enabled && !!requestId,
    queryFn: async () => {
      const { data, error } = await untypedFrom('leave_request_events')
        .select('id, leave_request_id, event_type, occurred_at, actor_user_id, actor_role, from_status, to_status, from_cancellation_status, to_cancellation_status, metadata, created_at')
        .eq('leave_request_id', requestId)
        .order('occurred_at', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as LeaveRequestEventRow[];
    },
  });

  const actorIds = useMemo(() => {
    if (!request) return [];
    return collectActorIds(request, eventsQuery.data ?? []);
  }, [eventsQuery.data, request]);

  const actorsQuery = useQuery({
    queryKey: ['leave-request-details', 'actors', actorIds],
    enabled: enabled && actorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', actorIds);

      if (error) throw error;
      return (data || []) as LeaveActorRecord[];
    },
  });

  useEffect(() => {
    if (!eventsQuery.error) return;
    toast.error('Failed to load leave event history', {
      description: sanitizeErrorMessage(eventsQuery.error),
    });
  }, [eventsQuery.error]);

  useEffect(() => {
    if (!actorsQuery.error) return;
    toast.error('Failed to load leave details', {
      description: sanitizeErrorMessage(actorsQuery.error),
    });
  }, [actorsQuery.error]);

  const actorsById = useMemo<DetailActorsById>(() => {
    const nextMap: DetailActorsById = {};
    if (request?.employee?.id) {
      nextMap[request.employee.id] = {
        id: request.employee.id,
        first_name: request.employee.first_name ?? null,
        last_name: request.employee.last_name ?? null,
        email: request.employee.email ?? request.employee_id,
      };
    }
    (actorsQuery.data || []).forEach((actor) => {
      nextMap[actor.id] = actor;
    });
    return nextMap;
  }, [actorsQuery.data, request]);

  const getActorLabel = useCallback((userId: string | null | undefined, fallbackLabel?: string | null) => {
    const actor = userId ? actorsById[userId] : undefined;
    return formatLeaveActorLabel(actor, userId, fallbackLabel);
  }, [actorsById]);

  const timelineEvents = useMemo(
    () => (eventsQuery.data ?? []).map(buildDetailTimelineEvent).filter((event): event is TimelineDisplayEvent => !!event),
    [eventsQuery.data],
  );

  const approvalTimelineEvents = useMemo(
    () => timelineEvents.filter((event) => {
      const source = (eventsQuery.data ?? []).find((row) => row.id === event.id);
      if (!source) return false;
      if (source.event_type.startsWith('leave_cancellation_')) return false;
      if (source.event_type === 'leave_status_changed' && source.to_status === 'cancelled') return false;
      return true;
    }),
    [eventsQuery.data, timelineEvents],
  );

  const cancellationTimelineEvents = useMemo(
    () => timelineEvents.filter((event) => {
      const source = (eventsQuery.data ?? []).find((row) => row.id === event.id);
      if (!source) return false;
      return source.event_type.startsWith('leave_cancellation_')
        || (source.event_type === 'leave_status_changed' && source.to_status === 'cancelled');
    }),
    [eventsQuery.data, timelineEvents],
  );

  return {
    events: eventsQuery.data ?? [],
    actorsById,
    approvalTimelineEvents,
    cancellationTimelineEvents,
    eventsLoading: eventsQuery.isLoading,
    actorsLoading: actorsQuery.isLoading,
    getActorLabel,
  };
}
