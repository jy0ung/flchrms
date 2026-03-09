import type { LeaveRequest } from '@/types/hrms';

export interface LeaveWorkflowPresentation {
  primaryStatus: { status: string; label: string };
  secondaryStatus: { status: string; label: string } | null;
  supportText: string | null;
}

export function getLeaveRequestAttentionLabel(input: {
  request: LeaveRequest;
  canApprove?: boolean;
  canApproveCancellation?: boolean;
  canRequestDocument?: boolean;
  canAmend?: boolean;
  canCancelPending?: boolean;
  canRequestCancellation?: boolean;
}): string | null {
  const {
    request,
    canApprove = false,
    canApproveCancellation = false,
    canRequestDocument = false,
    canAmend = false,
    canCancelPending = false,
    canRequestCancellation = false,
  } = input;

  if (canApproveCancellation) return 'Cancellation decision required';
  if (canApprove) return 'Approval decision required';
  if (canRequestDocument) return 'Document follow-up available';
  if (request.document_required && !request.document_url && request.status === 'pending') {
    return 'Waiting on supporting document';
  }
  if (canAmend) return 'Action needed: amend request';
  if (request.amended_at) return 'Updated after amendment';
  if (canRequestCancellation) return 'Eligible for cancellation';
  if (canCancelPending) return 'Pending and cancellable';
  if (request.cancellation_reason) return 'Cancellation requested';
  return null;
}

export function getLeaveWorkflowSupportNotes(request: LeaveRequest): string[] {
  const notes: string[] = [];

  if (request.document_required && !request.document_url && request.status === 'pending') {
    notes.push('Supporting document requested');
  } else if (request.document_url) {
    notes.push('Supporting document attached');
  }

  if (request.amended_at) {
    notes.push('Updated after amendment');
  }

  return notes;
}

export function getLeaveWorkflowPresentation(input: {
  request: LeaveRequest;
  statusDisplay: { status: string; label: string };
  cancellationBadge: { status: string; label: string } | null;
}): LeaveWorkflowPresentation {
  const { request, statusDisplay, cancellationBadge } = input;
  const workflowNotes = getLeaveWorkflowSupportNotes(request);

  return {
    primaryStatus: statusDisplay,
    secondaryStatus: cancellationBadge,
    supportText: workflowNotes.length > 0 ? workflowNotes.join(' • ') : null,
  };
}
