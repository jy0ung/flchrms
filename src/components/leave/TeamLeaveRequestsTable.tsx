import { format } from 'date-fns';
import { Check, Eye, FileText, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import { LeaveRequestContextSummary } from '@/components/leave/LeaveRequestContextSummary';
import {
  getLeaveRequestAttentionLabel,
  getLeaveWorkflowPresentation,
} from '@/components/leave/leave-request-context';
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
  emptyTitle: string;
  emptyMessage: string;
  role: import('@/lib/permissions').MaybeRole;
  getStatusDisplay: (request: LeaveRequest) => LeaveStatusDisplay;
  getCancellationBadge: (request: LeaveRequest) => LeaveCancellationBadge;
  shouldShowLeaveDetailsButton: (request: LeaveRequest) => boolean;
  canApproveCancellation: (request: LeaveRequest) => boolean;
  canApprove: (request: LeaveRequest) => boolean;
  onOpenDetails: (request: LeaveRequest, trigger?: HTMLElement | null) => void;
  onCancellationReview: (request: LeaveRequest, action: 'approve' | 'reject') => void;
  onAction: (request: LeaveRequest, action: LeaveActionDialogAction) => void;
}

export function TeamLeaveRequestsTable({
  requests,
  emptyTitle,
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
              title={emptyTitle}
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
                const workflowPresentation = getLeaveWorkflowPresentation({
                  request,
                  statusDisplay: status,
                  cancellationBadge,
                });
                const employeeName = getLeaveRequestEmployeeName(request);
                const employeeEmail = getLeaveRequestEmployeeEmail(request);
                const attentionLabel = getLeaveRequestAttentionLabel({
                  request,
                  canApprove: canApprove(request),
                  canApproveCancellation: canApproveCancellation(request),
                  canRequestDocument: canRequestDocumentAtCurrentStage(request),
                });

                return (
                  <div key={request.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{employeeName}</p>
                        <p className="text-xs text-muted-foreground truncate">{employeeEmail}</p>
                      </div>
                      <StatusBadge
                        status={workflowPresentation.primaryStatus.status}
                        labelOverride={workflowPresentation.primaryStatus.label}
                        className="shrink-0"
                      />
                    </div>

                    <div className="rounded-md bg-muted/40 px-3 py-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{request.leave_type?.name}</span>
                        {request.leave_type?.requires_document && (
                          <Badge variant="outline" className="text-[11px]">Doc Required</Badge>
                        )}
                        {workflowPresentation.secondaryStatus ? (
                          <StatusBadge
                            status={workflowPresentation.secondaryStatus.status}
                            labelOverride={workflowPresentation.secondaryStatus.label}
                            className="text-[11px]"
                          />
                        ) : null}
                      </div>
                      <p className="text-sm">
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">{request.days_count} days</p>
                      {workflowPresentation.supportText ? (
                        <p className="text-xs text-muted-foreground">
                          {workflowPresentation.supportText}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-md bg-muted/20 p-2">
                      <LeaveRequestContextSummary
                        request={request}
                        mode="compact"
                        attentionLabel={attentionLabel}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {shouldShowLeaveDetailsButton(request) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={(event) => onOpenDetails(request, event.currentTarget)}
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
              <table className="w-full min-w-[980px]">
                <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Request</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Workflow</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Context</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const status = getStatusDisplay(request);
                  const cancellationBadge = getCancellationBadge(request);
                  const workflowPresentation = getLeaveWorkflowPresentation({
                    request,
                    statusDisplay: status,
                    cancellationBadge,
                  });
                  const employeeName = getLeaveRequestEmployeeName(request);
                  const employeeEmail = getLeaveRequestEmployeeEmail(request);
                  const attentionLabel = getLeaveRequestAttentionLabel({
                    request,
                    canApprove: canApprove(request),
                    canApproveCancellation: canApproveCancellation(request),
                    canRequestDocument: canRequestDocumentAtCurrentStage(request),
                  });

                  return (
                    <tr key={request.id} className="border-t border-border table-row-hover align-top">
                      <td className="p-4">
                        <p className="font-medium">{employeeName}</p>
                        <p className="text-sm text-muted-foreground">{employeeEmail}</p>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">{request.leave_type?.name}</span>
                          {request.leave_type?.requires_document && (
                            <Badge variant="outline" className="ml-2 text-xs">Doc Required</Badge>
                          )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">{request.days_count} days</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              status={workflowPresentation.primaryStatus.status}
                              labelOverride={workflowPresentation.primaryStatus.label}
                            />
                            {workflowPresentation.secondaryStatus ? (
                              <StatusBadge
                                status={workflowPresentation.secondaryStatus.status}
                                labelOverride={workflowPresentation.secondaryStatus.label}
                              />
                            ) : null}
                          </div>
                          {workflowPresentation.supportText ? (
                            <p className="text-xs text-muted-foreground">
                              {workflowPresentation.supportText}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 max-w-sm">
                        <LeaveRequestContextSummary
                          request={request}
                          mode="compact"
                          attentionLabel={attentionLabel}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {shouldShowLeaveDetailsButton(request) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-full"
                              onClick={(event) => onOpenDetails(request, event.currentTarget)}
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
