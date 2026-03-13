import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveRequest } from '@/types/hrms';
import { getLeaveRequestDialogDescription } from '@/lib/leave-request-display';
import { ModalScaffold, ModalSection } from '@/components/system';

type CancellationDialogMode = 'pending_cancel' | 'request_approved_cancel';
type CancellationReviewAction = 'approve' | 'reject';

interface LeaveCancellationDialogsProps {
  requestDialogOpen: boolean;
  onRequestDialogOpenChange: (open: boolean) => void;
  requestDialogRequest: LeaveRequest | null;
  requestDialogMode: CancellationDialogMode;
  requestReason: string;
  onRequestReasonChange: (value: string) => void;
  onSubmitRequest: () => void;
  requestSubmitPending: boolean;
  reviewDialogOpen: boolean;
  onReviewDialogOpenChange: (open: boolean) => void;
  reviewDialogRequest: LeaveRequest | null;
  reviewAction: CancellationReviewAction;
  reviewComments: string;
  onReviewCommentsChange: (value: string) => void;
  reviewRejectionReason: string;
  onReviewRejectionReasonChange: (value: string) => void;
  onSubmitReview: () => void;
  reviewSubmitPending: boolean;
}

export function LeaveCancellationDialogs({
  requestDialogOpen,
  onRequestDialogOpenChange,
  requestDialogRequest,
  requestDialogMode,
  requestReason,
  onRequestReasonChange,
  onSubmitRequest,
  requestSubmitPending,
  reviewDialogOpen,
  onReviewDialogOpenChange,
  reviewDialogRequest,
  reviewAction,
  reviewComments,
  onReviewCommentsChange,
  reviewRejectionReason,
  onReviewRejectionReasonChange,
  onSubmitReview,
  reviewSubmitPending,
}: LeaveCancellationDialogsProps) {
  return (
    <>
      <ModalScaffold
        open={requestDialogOpen}
        onOpenChange={onRequestDialogOpenChange}
        maxWidth="xl"
        mobileLayout="full-screen"
        title={
          requestDialogMode === 'request_approved_cancel'
            ? 'Request Leave Cancellation'
            : 'Cancel Pending Leave Request'
        }
        description={getLeaveRequestDialogDescription(requestDialogRequest)}
        body={
          <div className="space-y-4">
            {requestDialogMode === 'request_approved_cancel' ? (
              <ModalSection
                title="Cancellation Request"
                description="Provide a reason so approvers can review the request."
                tone="warning"
              >
                <Label>Cancellation Reason</Label>
                <Textarea
                  value={requestReason}
                  onChange={(e) => onRequestReasonChange(e.target.value)}
                  placeholder="Explain why you are requesting cancellation..."
                  required
                  className="min-h-24 resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  This will submit a cancellation request for approver review.
                </p>
              </ModalSection>
            ) : (
              <ModalSection title="Immediate Cancellation" tone="muted">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This pending leave request will be cancelled immediately.
                  </AlertDescription>
                </Alert>
              </ModalSection>
            )}
          </div>
        }
        footer={
          <>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onRequestDialogOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={onSubmitRequest}
              disabled={requestSubmitPending || (requestDialogMode === 'request_approved_cancel' && !requestReason.trim())}
              variant={requestDialogMode === 'pending_cancel' ? 'destructive' : 'default'}
              className="w-full sm:w-auto"
            >
              {requestDialogMode === 'request_approved_cancel' ? 'Submit Cancellation Request' : 'Cancel Leave'}
            </Button>
          </>
        }
      />

      <ModalScaffold
        open={reviewDialogOpen}
        onOpenChange={onReviewDialogOpenChange}
        maxWidth="xl"
        mobileLayout="full-screen"
        title={reviewAction === 'approve' ? 'Approve Leave Cancellation' : 'Reject Leave Cancellation'}
        description={getLeaveRequestDialogDescription(reviewDialogRequest)}
        body={
          <div className="space-y-4">
            {reviewAction === 'reject' && (
              <ModalSection title="Rejection Reason" tone="danger">
                <Label>Rejection Reason</Label>
                <Textarea
                  value={reviewRejectionReason}
                  onChange={(e) => onReviewRejectionReasonChange(e.target.value)}
                  placeholder="Explain why this cancellation request is being rejected..."
                  required
                  className="min-h-24 resize-y"
                />
              </ModalSection>
            )}
            <ModalSection title="Reviewer Comments" description="Optional notes for the requester and audit trail.">
              <Label>Comments (Optional)</Label>
              <Textarea
                value={reviewComments}
                onChange={(e) => onReviewCommentsChange(e.target.value)}
                placeholder="Add any review comments..."
                className="min-h-24 resize-y"
              />
            </ModalSection>
          </div>
        }
        footer={
          <>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onReviewDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={onSubmitReview}
              disabled={reviewSubmitPending || (reviewAction === 'reject' && !reviewRejectionReason.trim())}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
              className="w-full sm:w-auto"
            >
              {reviewAction === 'approve' ? 'Approve Cancellation' : 'Reject Cancellation'}
            </Button>
          </>
        }
      />
    </>
  );
}
