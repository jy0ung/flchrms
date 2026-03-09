import type { LeaveRequest } from '@/types/hrms';

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
