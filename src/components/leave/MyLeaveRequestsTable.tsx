import { format } from 'date-fns';
import { AlertCircle, Eye, FileText, MessageSquare, Upload, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import type { LeaveRequest } from '@/types/hrms';
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

interface MyLeaveRequestsTableProps {
  requests: LeaveRequest[];
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
              title="No leave requests in this view"
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

                return (
                  <div key={request.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{request.leave_type?.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {request.leave_type?.requires_document && (
                            <Badge variant="outline" className="text-[11px]">Doc Required</Badge>
                          )}
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
                      <StatusBadge status={status.status} labelOverride={status.label} className="shrink-0" />
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">{request.days_count} days</p>
                      </div>
                      <div className="rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</p>
                        <div className="space-y-1 text-xs">
                          {request.reason && (
                            <p className="truncate" title={request.reason}>
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              {request.reason}
                            </p>
                          )}
                          {request.rejection_reason && (
                            <p className="truncate text-red-500" title={request.rejection_reason}>
                              <XCircle className="w-3 h-3 inline mr-1" />
                              {request.rejection_reason}
                            </p>
                          )}
                          {request.manager_comments && (
                            <p className="truncate text-blue-500" title={request.manager_comments}>
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              {request.manager_comments}
                            </p>
                          )}
                          {request.cancellation_reason && (
                            <p className="truncate text-amber-600" title={request.cancellation_reason}>
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Cancel req: {request.cancellation_reason}
                            </p>
                          )}
                          {request.cancellation_rejection_reason && (
                            <p className="truncate text-red-500" title={request.cancellation_rejection_reason}>
                              <XCircle className="w-3 h-3 inline mr-1" />
                              Cancel reject: {request.cancellation_rejection_reason}
                            </p>
                          )}
                          {!request.reason &&
                            !request.rejection_reason &&
                            !request.manager_comments &&
                            !request.cancellation_reason &&
                            !request.cancellation_rejection_reason && (
                              <p className="text-muted-foreground">No notes</p>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
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
                      {request.document_url && <DocumentViewButton documentPath={request.document_url} />}
                      {canAmend(request) && (
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => onAmend(request)}>
                          <Upload className="w-4 h-4 mr-1" />
                          Amend
                        </Button>
                      )}
                      {canCancelPendingRequest(request) && (
                        <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => onCancel(request)}>
                          Cancel
                        </Button>
                      )}
                      {canRequestCancellation(request) && (
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => onCancel(request)}>
                          Request Cancellation
                        </Button>
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

                  return (
                    <tr key={request.id} className="border-t border-border table-row-hover align-top">
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
                              onClick={(event) => onOpenDetails(request, event.currentTarget)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          )}
                          {request.document_url && (
                            <DocumentViewButton documentPath={request.document_url} />
                          )}
                          {canAmend(request) && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => onAmend(request)}>
                              <Upload className="w-4 h-4 mr-1" />
                              Amend
                            </Button>
                          )}
                          {canCancelPendingRequest(request) && (
                            <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => onCancel(request)}>
                              Cancel
                            </Button>
                          )}
                          {canRequestCancellation(request) && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => onCancel(request)}>
                              Request Cancellation
                            </Button>
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
