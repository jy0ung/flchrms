import { format } from 'date-fns';
import { AlertCircle, Check, Eye, FileText, MessageSquare, Upload, X, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import type { LeaveRequest } from '@/types/hrms';
import type { LeaveActionDialogAction } from '@/components/leave/LeaveActionDialog';
import { canRequestLeaveSupportingDocument, canViewLeaveSupportingDocument } from '@/lib/permissions';
import { getLeaveRequestEmployeeEmail, getLeaveRequestEmployeeName } from '@/lib/leave-request-display';
import { StatusBadge } from '@/components/system';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';

type LeaveStatusDisplay = {
  status: string;
  label: string;
};

type LeaveCancellationBadge = {
  status: string;
  label: string;
} | null;

interface TeamLeaveRequestsTableProps {
  requests: LeaveRequest[];
  emptyMessage: string;
  role: import('@/lib/permissions').MaybeRole;
  getStatusDisplay: (request: LeaveRequest) => LeaveStatusDisplay;
  getCancellationBadge: (request: LeaveRequest) => LeaveCancellationBadge;
  shouldShowLeaveDetailsButton: (request: LeaveRequest) => boolean;
  canApproveCancellation: (request: LeaveRequest) => boolean;
  canApprove: (request: LeaveRequest) => boolean;
  onOpenDetails: (request: LeaveRequest) => void;
  onCancellationReview: (request: LeaveRequest, action: 'approve' | 'reject') => void;
  onAction: (request: LeaveRequest, action: LeaveActionDialogAction) => void;
}

export function TeamLeaveRequestsTable({
  requests,
  emptyMessage,
  role,
  getStatusDisplay,
  getCancellationBadge,
  shouldShowLeaveDetailsButton,
  canApproveCancellation,
  canApprove,
  onOpenDetails,
  onCancellationReview,
  onAction,
}: TeamLeaveRequestsTableProps) {
  const canRequestDocumentAtCurrentStage = (request: LeaveRequest) =>
    canApprove(request) &&
    request.status === 'pending' &&
    role === 'manager' &&
    canRequestLeaveSupportingDocument(role);

  return (
    <div className="rounded-lg border border-border shadow-sm">
      <div className="p-0">
        {requests.length === 0 ? (
          <div className="p-4">
            <WorkspaceStatePanel
              title="No team requests in this view"
              description={emptyMessage}
              icon={FileText}
            />
          </div>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {requests.map((request) => {
                const status = getStatusDisplay(request);
                const cancellationBadge = getCancellationBadge(request);
                const employeeName = getLeaveRequestEmployeeName(request);
                const employeeEmail = getLeaveRequestEmployeeEmail(request);

                return (
                  <div key={request.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{employeeName}</p>
                        <p className="text-xs text-muted-foreground truncate">{employeeEmail}</p>
                      </div>
                      <StatusBadge status={status.status} labelOverride={status.label} className="shrink-0" />
                    </div>

                    <div className="rounded-md bg-muted/40 px-3 py-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{request.leave_type?.name}</span>
                        {request.leave_type?.requires_document && (
                          <Badge variant="outline" className="text-[11px]">Doc Required</Badge>
                        )}
                        {request.amended_at && (
                          <StatusBadge status="amended" className="text-[11px]" />
                        )}
                      </div>
                      <p className="text-sm">
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">{request.days_count} days</p>
                      <div className="flex flex-wrap gap-1">
                        {request.document_required && !request.document_url && request.status === 'pending' && (
                          <StatusBadge status="document_requested" className="text-[11px]" />
                        )}
                        {request.document_url && (
                          <StatusBadge status="document_attached" className="text-[11px]" />
                        )}
                        {cancellationBadge && (
                          <StatusBadge
                            status={cancellationBadge.status}
                            labelOverride={cancellationBadge.label}
                            className="text-[11px]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border p-3 space-y-1 text-xs">
                      {request.reason && (
                        <p className="text-muted-foreground" title={request.reason}>
                          <MessageSquare className="w-3 h-3 inline mr-1" />
                          {request.reason}
                        </p>
                      )}
                      {request.rejection_reason && (
                        <p className="text-red-500" title={request.rejection_reason}>
                          <XCircle className="w-3 h-3 inline mr-1" />
                          {request.rejection_reason}
                        </p>
                      )}
                      {request.manager_comments && (
                        <p className="text-blue-500" title={request.manager_comments}>
                          <MessageSquare className="w-3 h-3 inline mr-1" />
                          {request.manager_comments}
                        </p>
                      )}
                      {request.amendment_notes && (
                        <p className="text-violet-600" title={request.amendment_notes}>
                          <FileText className="w-3 h-3 inline mr-1" />
                          Amendment: {request.amendment_notes}
                        </p>
                      )}
                      {request.cancellation_reason && (
                        <p className="text-amber-600" title={request.cancellation_reason}>
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          Cancel req: {request.cancellation_reason}
                        </p>
                      )}
                      {request.cancellation_rejection_reason && (
                        <p className="text-red-500" title={request.cancellation_rejection_reason}>
                          <XCircle className="w-3 h-3 inline mr-1" />
                          Cancel reject: {request.cancellation_rejection_reason}
                        </p>
                      )}
                      {!request.reason &&
                        !request.rejection_reason &&
                        !request.manager_comments &&
                        !request.amendment_notes &&
                        !request.cancellation_reason &&
                        !request.cancellation_rejection_reason && (
                          <p className="text-muted-foreground">No details provided.</p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {shouldShowLeaveDetailsButton(request) && (
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onOpenDetails(request)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      )}
                      {canApproveCancellation(request) ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-green-500/30 text-green-700 hover:bg-green-500/10"
                            onClick={() => onCancellationReview(request, 'approve')}
                          >
                            Approve Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-red-500/30 text-red-700 hover:bg-red-500/10"
                            onClick={() => onCancellationReview(request, 'reject')}
                          >
                            Reject Cancel
                          </Button>
                        </>
                      ) : canApprove(request) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-green-500/30 text-green-700 hover:bg-green-500/10"
                            onClick={() => onAction(request, 'approve')}
                            aria-label="Approve"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-red-500/30 text-red-700 hover:bg-red-500/10"
                            onClick={() => onAction(request, 'reject')}
                            aria-label="Reject"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          {canRequestDocumentAtCurrentStage(request) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-orange-500/30 text-orange-700 hover:bg-orange-500/10"
                              onClick={() => onAction(request, 'request_document')}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Request Doc
                            </Button>
                          )}
                        </>
                      )}
                      {request.document_url && canViewLeaveSupportingDocument(role) && (
                        <DocumentViewButton documentPath={request.document_url} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1120px]">
                <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Details</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const status = getStatusDisplay(request);
                  const cancellationBadge = getCancellationBadge(request);
                  const employeeName = getLeaveRequestEmployeeName(request);
                  const employeeEmail = getLeaveRequestEmployeeEmail(request);

                  return (
                    <tr key={request.id} className="border-t border-border table-row-hover align-top">
                      <td className="p-4">
                        <p className="font-medium">{employeeName}</p>
                        <p className="text-sm text-muted-foreground">{employeeEmail}</p>
                      </td>
                      <td className="p-4">
                        <div>
                          {request.leave_type?.name}
                          {request.leave_type?.requires_document && (
                            <Badge variant="outline" className="ml-2 text-xs">Doc Required</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p>{format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{request.days_count} days</p>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={status.status} labelOverride={status.label} />
                        {request.document_required && !request.document_url && request.status === 'pending' && (
                          <StatusBadge status="document_requested" className="mt-1" />
                        )}
                        {request.document_url && (
                          <StatusBadge status="document_attached" className="mt-1" />
                        )}
                        {request.amended_at && (
                          <StatusBadge status="amended" className="mt-1 text-xs" />
                        )}
                        {cancellationBadge && (
                          <StatusBadge
                            status={cancellationBadge.status}
                            labelOverride={cancellationBadge.label}
                            className="mt-1"
                          />
                        )}
                      </td>
                      <td className="p-4 max-w-xs">
                        {request.reason && (
                          <p className="text-sm text-muted-foreground truncate" title={request.reason}>
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            {request.reason}
                          </p>
                        )}
                        {request.rejection_reason && (
                          <p className="text-sm text-red-500 truncate" title={request.rejection_reason}>
                            <XCircle className="w-3 h-3 inline mr-1" />
                            {request.rejection_reason}
                          </p>
                        )}
                        {request.manager_comments && (
                          <p className="text-sm text-blue-500 truncate" title={request.manager_comments}>
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            {request.manager_comments}
                          </p>
                        )}
                        {request.amendment_notes && (
                          <p className="text-sm text-purple-500 truncate" title={request.amendment_notes}>
                            <FileText className="w-3 h-3 inline mr-1" />
                            Amendment: {request.amendment_notes}
                          </p>
                        )}
                        {request.cancellation_reason && (
                          <p className="text-sm text-amber-600 truncate" title={request.cancellation_reason}>
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            Cancel req: {request.cancellation_reason}
                          </p>
                        )}
                        {request.cancellation_rejection_reason && (
                          <p className="text-sm text-red-500 truncate" title={request.cancellation_rejection_reason}>
                            <XCircle className="w-3 h-3 inline mr-1" />
                            Cancel reject: {request.cancellation_rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {shouldShowLeaveDetailsButton(request) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-full"
                              onClick={() => onOpenDetails(request)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          )}
                          {canApproveCancellation(request) ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-green-500/30 text-green-700 hover:bg-green-500/10"
                                onClick={() => onCancellationReview(request, 'approve')}
                              >
                                Approve Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-red-500/30 text-red-700 hover:bg-red-500/10"
                                onClick={() => onCancellationReview(request, 'reject')}
                              >
                                Reject Cancel
                              </Button>
                            </>
                          ) : canApprove(request) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-green-500/30 text-green-700 hover:bg-green-500/10"
                                onClick={() => onAction(request, 'approve')}
                                aria-label="Approve"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                <span className="hidden lg:inline">Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-red-500/30 text-red-700 hover:bg-red-500/10"
                                onClick={() => onAction(request, 'reject')}
                                aria-label="Reject"
                              >
                                <X className="w-4 h-4 mr-1" />
                                <span className="hidden lg:inline">Reject</span>
                              </Button>
                          {canRequestDocumentAtCurrentStage(request) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-orange-500/30 text-orange-700 hover:bg-orange-500/10"
                              onClick={() => onAction(request, 'request_document')}
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  <span className="hidden xl:inline">Request Doc</span>
                                </Button>
                              )}
                            </>
                          )}
                          {request.document_url && canViewLeaveSupportingDocument(role) && (
                            <DocumentViewButton documentPath={request.document_url} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
