import { format } from 'date-fns';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import { type LeaveRequest } from '@/types/hrms';
import { canViewLeaveSupportingDocument } from '@/lib/permissions';
import { ModalScaffold, ModalSection, StatusBadge } from '@/components/system';

type TimelineDisplayEvent = {
  id: string;
  label: string;
  at: string;
  by?: string | null;
  roleLabel?: string | null;
  reason?: string | null;
  subtext?: string | null;
};

type LeaveStatusDisplay = {
  status: string;
  label: string;
};

type LeaveCancellationBadge = {
  status: string;
  label: string;
} | null;

interface LeaveDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
  role: string | null;
  actorsLoading: boolean;
  eventsLoading: boolean;
  approvalTimelineEvents: TimelineDisplayEvent[];
  cancellationTimelineEvents: TimelineDisplayEvent[];
  formatDateTime: (value: string | null | undefined) => string;
  getActorLabel: (userId: string | null | undefined, fallbackLabel?: string | null) => string;
  getStatusDisplay: (request: LeaveRequest) => LeaveStatusDisplay;
  getCancellationBadge: (request: LeaveRequest) => LeaveCancellationBadge;
}

const formatWorkflowStageLabel = (stage: string) => {
  if (stage === 'general_manager') return 'General Manager';
  if (stage === 'manager') return 'Manager';
  if (stage === 'director') return 'Director';
  return stage;
};

export function LeaveDetailsDialog({
  open,
  onOpenChange,
  request,
  role,
  actorsLoading,
  eventsLoading,
  approvalTimelineEvents,
  cancellationTimelineEvents,
  formatDateTime,
  getActorLabel,
  getStatusDisplay,
  getCancellationBadge,
}: LeaveDetailsDialogProps) {
  if (!request) {
    return (
      <ModalScaffold
        open={open}
        onOpenChange={onOpenChange}
        maxWidth="4xl"
        title="Leave Request Details"
        description="Approval history and request timeline for the selected leave request."
        body={<div />}
      />
    );
  }

  const statusDisplay = getStatusDisplay(request);
  const cancellationBadge = getCancellationBadge(request);

  return (
    <ModalScaffold
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="4xl"
      title="Leave Request Details"
      description="Approval history and request timeline for the selected leave request."
      bodyClassName="max-h-[75vh] overflow-y-auto pr-1"
      body={
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ModalSection title="Request Summary" className="space-y-2 shadow-sm">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Employee:</span> {request.employee?.first_name} {request.employee?.last_name}</p>
                <p><span className="text-muted-foreground">Email:</span> {request.employee?.email || '—'}</p>
                <p><span className="text-muted-foreground">Leave Type:</span> {request.leave_type?.name || '—'}</p>
                <p><span className="text-muted-foreground">Dates:</span> {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}</p>
                <p><span className="text-muted-foreground">Duration:</span> {request.days_count} day(s)</p>
                <p><span className="text-muted-foreground">Created:</span> {formatDateTime(request.created_at)}</p>
                <p><span className="text-muted-foreground">Last Updated:</span> {formatDateTime(request.updated_at)}</p>
              </div>
            </ModalSection>

            <ModalSection title="Status & Routing" className="space-y-2 shadow-sm">
              <div className="space-y-2">
                <StatusBadge status={statusDisplay.status} labelOverride={statusDisplay.label} />
                {cancellationBadge && (
                  <StatusBadge
                    status={cancellationBadge.status}
                    labelOverride={cancellationBadge.label}
                    className="mt-1"
                    showIcon
                  />
                )}
                <p className="text-sm">
                  <span className="text-muted-foreground">Approval Route:</span>{' '}
                  {(request.approval_route_snapshot || [])
                    .map(formatWorkflowStageLabel)
                    .join(' -> ') || '—'}
                </p>
                {request.cancellation_route_snapshot && request.cancellation_route_snapshot.length > 0 && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Cancellation Route:</span>{' '}
                    {request.cancellation_route_snapshot
                      .map(formatWorkflowStageLabel)
                      .join(' -> ')}
                  </p>
                )}
                {request.document_url && canViewLeaveSupportingDocument(role) && (
                  <div>
                    <DocumentViewButton documentPath={request.document_url} />
                  </div>
                )}
                {actorsLoading && (
                  <p className="text-xs text-muted-foreground">Loading approver names...</p>
                )}
              </div>
            </ModalSection>
          </div>

          <ModalSection title="Approval Timeline" className="space-y-3 shadow-sm">
            <div className="space-y-2 text-sm">
              {eventsLoading && (
                <p className="text-muted-foreground">Loading event history...</p>
              )}
              {!eventsLoading && approvalTimelineEvents.length > 0 ? (
                approvalTimelineEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border bg-muted/20 px-3 py-2">
                    <p className="font-medium">{event.label}</p>
                    <p className="text-muted-foreground">
                      {formatDateTime(event.at)}
                      {event.by ? ` by ${getActorLabel(event.by, event.roleLabel)}` : ''}
                      {!event.by && event.roleLabel ? ` by ${event.roleLabel}` : ''}
                    </p>
                    {event.subtext && (
                      <p className="mt-1 text-muted-foreground">{event.subtext}</p>
                    )}
                    {event.reason && (
                      <p className="mt-1 text-muted-foreground">{event.reason}</p>
                    )}
                  </div>
                ))
              ) : (
                <>
                  {[
                    {
                      label: 'Submitted',
                      at: request.created_at,
                      by: request.employee_id,
                      roleLabel: 'Requester',
                    },
                    {
                      label: 'Manager Approved',
                      at: request.manager_approved_at,
                      by: request.manager_approved_by,
                      roleLabel: 'Manager',
                    },
                    {
                      label: 'General Manager Approved',
                      at: request.gm_approved_at,
                      by: request.gm_approved_by,
                      roleLabel: 'General Manager',
                    },
                    {
                      label: 'Director Approved',
                      at: request.director_approved_at,
                      by: request.director_approved_by,
                      roleLabel: 'Director',
                    },
                    {
                      label: 'Legacy HR Approved',
                      at: request.hr_approved_at,
                      by: request.hr_approved_by,
                      roleLabel: 'HR',
                    },
                    {
                      label: 'Final Approval',
                      at: request.final_approved_at,
                      by: request.final_approved_by,
                      roleLabel: request.final_approved_by_role || 'Final Approver',
                    },
                    {
                      label: 'Rejected',
                      at: request.rejected_at,
                      by: request.rejected_by,
                      roleLabel: 'Approver',
                      reason: request.rejection_reason,
                    },
                  ]
                    .filter((item) => !!item.at)
                    .map((item) => (
                      <div key={`${item.label}-${item.at}`} className="rounded-lg border bg-muted/20 px-3 py-2">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-muted-foreground">
                          {formatDateTime(item.at)} by {getActorLabel(item.by, item.roleLabel)}
                        </p>
                        {'reason' in item && item.reason && (
                          <p className="text-red-500 mt-1">{item.reason}</p>
                        )}
                      </div>
                    ))}
                  {!request.final_approved_at && !request.rejected_at && (
                    <p className="text-muted-foreground">This request has not been finalized yet.</p>
                  )}
                </>
              )}
            </div>
          </ModalSection>

          {(request.cancellation_status || request.cancelled_at) && (
            <ModalSection title="Cancellation Timeline" className="space-y-3 shadow-sm">
              <div className="space-y-2 text-sm">
                {eventsLoading && (
                  <p className="text-muted-foreground">Loading event history...</p>
                )}
                {!eventsLoading && cancellationTimelineEvents.length > 0 ? (
                  cancellationTimelineEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border bg-muted/20 px-3 py-2">
                      <p className="font-medium">{event.label}</p>
                      <p className="text-muted-foreground">
                        {formatDateTime(event.at)}
                        {event.by ? ` by ${getActorLabel(event.by, event.roleLabel)}` : ''}
                        {!event.by && event.roleLabel ? ` by ${event.roleLabel}` : ''}
                      </p>
                      {event.subtext && (
                        <p className="mt-1 text-muted-foreground">{event.subtext}</p>
                      )}
                      {event.reason && (
                        <p className="mt-1 text-muted-foreground">{event.reason}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <>
                    {[
                      {
                        label: 'Cancellation Requested',
                        at: request.cancellation_requested_at,
                        by: request.cancellation_requested_by,
                        roleLabel: 'Requester',
                        reason: request.cancellation_reason,
                      },
                      {
                        label: 'Cancellation Manager Approved',
                        at: request.cancellation_manager_approved_at,
                        by: request.cancellation_manager_approved_by,
                        roleLabel: 'Manager',
                      },
                      {
                        label: 'Cancellation GM Approved',
                        at: request.cancellation_gm_approved_at,
                        by: request.cancellation_gm_approved_by,
                        roleLabel: 'General Manager',
                      },
                      {
                        label: 'Cancellation Director Approved',
                        at: request.cancellation_director_approved_at,
                        by: request.cancellation_director_approved_by,
                        roleLabel: 'Director',
                      },
                      {
                        label: 'Cancellation Final Approval',
                        at: request.cancellation_final_approved_at,
                        by: request.cancellation_final_approved_by,
                        roleLabel: request.cancellation_final_approved_by_role || 'Final Approver',
                      },
                      {
                        label: 'Cancellation Rejected',
                        at: request.cancellation_rejected_at,
                        by: request.cancellation_rejected_by,
                        roleLabel: 'Approver',
                        reason: request.cancellation_rejection_reason,
                      },
                      {
                        label: 'Leave Marked Cancelled',
                        at: request.cancelled_at,
                        by: request.cancelled_by,
                        roleLabel: request.cancelled_by_role || 'System',
                      },
                    ]
                      .filter((item) => !!item.at)
                      .map((item) => (
                        <div key={`${item.label}-${item.at}`} className="rounded-lg border bg-muted/20 px-3 py-2">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground">
                            {formatDateTime(item.at)} by {getActorLabel(item.by, item.roleLabel)}
                          </p>
                          {'reason' in item && item.reason && (
                            <p className="mt-1 text-muted-foreground">{item.reason}</p>
                          )}
                        </div>
                      ))}
                    {!request.cancellation_requested_at && (
                      <p className="text-muted-foreground">No cancellation request history recorded.</p>
                    )}
                  </>
                )}
              </div>
            </ModalSection>
          )}

          {(request.reason || request.manager_comments || request.amendment_notes) && (
            <ModalSection title="Notes" className="space-y-2 text-sm shadow-sm">
              {request.reason && (
                <p><span className="text-muted-foreground">Reason:</span> {request.reason}</p>
              )}
              {request.manager_comments && (
                <p><span className="text-muted-foreground">Approver Comments:</span> {request.manager_comments}</p>
              )}
              {request.amendment_notes && (
                <p><span className="text-muted-foreground">Amendment Notes:</span> {request.amendment_notes}</p>
              )}
            </ModalSection>
          )}
        </div>
      }
    />
  );
}
