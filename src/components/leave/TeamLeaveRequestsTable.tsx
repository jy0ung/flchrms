import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Check, Eye, FileText, MessageSquare, Upload, X, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import type { LeaveRequest } from '@/types/hrms';
import type { LeaveActionDialogAction } from '@/components/leave/LeaveActionDialog';
import { canRequestLeaveSupportingDocument, canViewLeaveSupportingDocument } from '@/lib/permissions';

type LeaveStatusDisplay = {
  color: string;
  icon: ReactNode;
  label: string;
};

type LeaveCancellationBadge = {
  className: string;
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
  return (
    <Card className="card-stat">
      <CardContent className="p-0">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
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

                  return (
                    <tr key={request.id} className="border-t border-border table-row-hover">
                      <td className="p-4">
                        <p className="font-medium">{request.employee?.first_name} {request.employee?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{request.employee?.email}</p>
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
                        <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                          {status.icon}
                          {status.label}
                        </Badge>
                        {request.document_required && !request.document_url && request.status === 'pending' && (
                          <Badge variant="outline" className="mt-1 text-orange-500 border-orange-500/30 flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            Doc Requested
                          </Badge>
                        )}
                        {request.document_url && (
                          <Badge variant="outline" className="mt-1 text-green-500 border-green-500/30 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Doc Attached
                          </Badge>
                        )}
                        {request.amended_at && (
                          <Badge variant="outline" className="mt-1 text-blue-500 border-blue-500/30 text-xs">
                            Amended
                          </Badge>
                        )}
                        {cancellationBadge && (
                          <Badge variant="outline" className={`${cancellationBadge.className} flex items-center gap-1`}>
                            <AlertCircle className="w-3 h-3" />
                            {cancellationBadge.label}
                          </Badge>
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
                                className="text-green-600 hover:bg-green-500/10"
                                onClick={() => onCancellationReview(request, 'approve')}
                              >
                                Approve Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-500/10"
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
                                className="text-green-600 hover:bg-green-500/10"
                                onClick={() => onAction(request, 'approve')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-500/10"
                                onClick={() => onAction(request, 'reject')}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              {canRequestLeaveSupportingDocument(role) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 hover:bg-orange-500/10"
                                  onClick={() => onAction(request, 'request_document')}
                                >
                                  <FileText className="w-4 h-4" />
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
        )}
      </CardContent>
    </Card>
  );
}
