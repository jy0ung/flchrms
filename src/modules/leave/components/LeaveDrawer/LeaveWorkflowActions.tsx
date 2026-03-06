import { Check, FileText, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LeaveRequest } from '@/types/hrms';

import type { LeaveRowActionPermissions } from '@/modules/leave/types';

interface LeaveWorkflowActionsProps {
  request: LeaveRequest;
  permissions: LeaveRowActionPermissions;
  onApprove: (request: LeaveRequest) => void;
  onReject: (request: LeaveRequest) => void;
  onRequestDocument: (request: LeaveRequest) => void;
  onAmend: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
  onApproveCancellation: (request: LeaveRequest) => void;
  onRejectCancellation: (request: LeaveRequest) => void;
}

export function LeaveWorkflowActions({
  request,
  permissions,
  onApprove,
  onReject,
  onRequestDocument,
  onAmend,
  onCancel,
  onApproveCancellation,
  onRejectCancellation,
}: LeaveWorkflowActionsProps) {
  const hasActions =
    permissions.canApprove ||
    permissions.canRequestDocument ||
    permissions.canAmend ||
    permissions.canCancelPending ||
    permissions.canRequestCancellation ||
    permissions.canApproveCancellation;

  if (!hasActions) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap gap-2 justify-end">
      {permissions.canAmend ? (
        <Button variant="outline" className="rounded-full" onClick={() => onAmend(request)}>
          <Upload className="mr-2 h-4 w-4" />
          Amend
        </Button>
      ) : null}

      {permissions.canCancelPending ? (
        <Button variant="destructive" className="rounded-full" onClick={() => onCancel(request)}>
          Cancel
        </Button>
      ) : null}

      {permissions.canRequestCancellation ? (
        <Button variant="outline" className="rounded-full" onClick={() => onCancel(request)}>
          Request Cancellation
        </Button>
      ) : null}

      {permissions.canApproveCancellation ? (
        <>
          <Button variant="outline" className="rounded-full border-green-500/30 text-green-700 hover:bg-green-500/10" onClick={() => onApproveCancellation(request)}>
            Approve Cancellation
          </Button>
          <Button variant="outline" className="rounded-full border-red-500/30 text-red-700 hover:bg-red-500/10" onClick={() => onRejectCancellation(request)}>
            Reject Cancellation
          </Button>
        </>
      ) : null}

      {permissions.canApprove ? (
        <Button variant="outline" className="rounded-full border-green-500/30 text-green-700 hover:bg-green-500/10" onClick={() => onApprove(request)}>
          <Check className="mr-2 h-4 w-4" />
          Approve
        </Button>
      ) : null}

      {permissions.canReject ? (
        <Button variant="outline" className="rounded-full border-red-500/30 text-red-700 hover:bg-red-500/10" onClick={() => onReject(request)}>
          <X className="mr-2 h-4 w-4" />
          Reject
        </Button>
      ) : null}

      {permissions.canRequestDocument ? (
        <Button variant="outline" className="rounded-full border-orange-500/30 text-orange-700 hover:bg-orange-500/10" onClick={() => onRequestDocument(request)}>
          <FileText className="mr-2 h-4 w-4" />
          Request Document
        </Button>
      ) : null}
    </div>
  );
}
