import { format } from 'date-fns';
import { Eye, FileText, Upload } from 'lucide-react';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import { LeaveRequestContextSummary } from '@/components/leave/LeaveRequestContextSummary';
import {
  getLeaveRequestAttentionLabel,
  getLeaveWorkflowPresentation,
} from '@/components/leave/leave-request-context';
import type { LeaveRequest } from '@/types/hrms';
import { MetaBadge, RowActionButton, StatusBadge } from '@/components/system';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';

type LeaveStatusDisplay = {
  status: string;
  label: string;
};

type LeaveCancellationBadge = {
  status: string;
  label: string;
} | null;

interface MyLeaveRequestsTableProps {
  requests: LeaveRequest[];
  emptyTitle: string;
  emptyMessage: string;
  getStatusDisplay: (request: LeaveRequest) => LeaveStatusDisplay;
  getCancellationBadge: (request: LeaveRequest) => LeaveCancellationBadge;
  shouldShowLeaveDetailsButton: (request: LeaveRequest) => boolean;
  canAmend: (request: LeaveRequest) => boolean;
  canCancelPendingRequest: (request: LeaveRequest) => boolean;
  canRequestCancellation: (request: LeaveRequest) => boolean;
  onOpenDetails: (request: LeaveRequest, trigger?: HTMLElement | null) => void;
  onAmend: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
}

export function MyLeaveRequestsTable({
  requests,
  emptyTitle,
  emptyMessage,
  getStatusDisplay,
  getCancellationBadge,
  shouldShowLeaveDetailsButton,
  canAmend,
  canCancelPendingRequest,
  canRequestCancellation,
  onOpenDetails,
  onAmend,
  onCancel,
}: MyLeaveRequestsTableProps) {
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
                const attentionLabel = getLeaveRequestAttentionLabel({
                  request,
                  canAmend: canAmend(request),
                  canCancelPending: canCancelPendingRequest(request),
                  canRequestCancellation: canRequestCancellation(request),
                });

                return (
                  <div key={request.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{request.leave_type?.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {request.leave_type?.requires_document && (
                            <MetaBadge tone="warning">Doc Required</MetaBadge>
                          )}
                          {workflowPresentation.secondaryStatus ? (
                            <StatusBadge
                              status={workflowPresentation.secondaryStatus.status}
                              labelOverride={workflowPresentation.secondaryStatus.label}
                              className="text-[11px]"
                            />
                          ) : null}
                        </div>
                      </div>
                      <StatusBadge
                        status={workflowPresentation.primaryStatus.status}
                        labelOverride={workflowPresentation.primaryStatus.label}
                        className="shrink-0"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">{request.days_count} days</p>
                        {workflowPresentation.supportText ? (
                          <p className="mt-2 text-xs text-muted-foreground">
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
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {shouldShowLeaveDetailsButton(request) && (
                        <RowActionButton
                          type="button"
                          onClick={(event) => onOpenDetails(request, event.currentTarget)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </RowActionButton>
                      )}
                      {request.document_url && <DocumentViewButton documentPath={request.document_url} />}
                      {canAmend(request) && (
                        <RowActionButton type="button" onClick={() => onAmend(request)}>
                          <Upload className="w-4 h-4 mr-1" />
                          Amend
                        </RowActionButton>
                      )}
                      {canCancelPendingRequest(request) && (
                        <RowActionButton type="button" tone="danger" onClick={() => onCancel(request)}>
                          Cancel
                        </RowActionButton>
                      )}
                      {canRequestCancellation(request) && (
                        <RowActionButton type="button" onClick={() => onCancel(request)}>
                          Request Cancellation
                        </RowActionButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px]">
                <thead className="bg-muted/50">
                <tr>
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
                  const attentionLabel = getLeaveRequestAttentionLabel({
                    request,
                    canAmend: canAmend(request),
                    canCancelPending: canCancelPendingRequest(request),
                    canRequestCancellation: canRequestCancellation(request),
                  });

                  return (
                    <tr key={request.id} className="border-t border-border table-row-hover align-top">
                      <td className="p-4">
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">{request.leave_type?.name}</span>
                          {request.leave_type?.requires_document && (
                            <MetaBadge tone="warning" className="ml-2">Doc Required</MetaBadge>
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
                            <RowActionButton
                              type="button"
                              onClick={(event) => onOpenDetails(request, event.currentTarget)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </RowActionButton>
                          )}
                          {request.document_url && (
                            <DocumentViewButton documentPath={request.document_url} />
                          )}
                          {canAmend(request) && (
                            <RowActionButton type="button" onClick={() => onAmend(request)}>
                              <Upload className="w-4 h-4 mr-1" />
                              Amend
                            </RowActionButton>
                          )}
                          {canCancelPendingRequest(request) && (
                            <RowActionButton type="button" tone="danger" onClick={() => onCancel(request)}>
                              Cancel
                            </RowActionButton>
                          )}
                          {canRequestCancellation(request) && (
                            <RowActionButton type="button" onClick={() => onCancel(request)}>
                              Request Cancellation
                            </RowActionButton>
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
