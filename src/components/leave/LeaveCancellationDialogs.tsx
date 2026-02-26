import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveRequest } from '@/types/hrms';

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
      <Dialog open={requestDialogOpen} onOpenChange={onRequestDialogOpenChange}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {requestDialogMode === 'request_approved_cancel'
                ? 'Request Leave Cancellation'
                : 'Cancel Pending Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {requestDialogRequest?.employee?.first_name} {requestDialogRequest?.employee?.last_name} - {requestDialogRequest?.leave_type?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {requestDialogMode === 'request_approved_cancel' ? (
              <div className="space-y-2">
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
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This pending leave request will be cancelled immediately.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={onReviewDialogOpenChange}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve'
                ? 'Approve Leave Cancellation'
                : 'Reject Leave Cancellation'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialogRequest?.employee?.first_name} {reviewDialogRequest?.employee?.last_name} - {reviewDialogRequest?.leave_type?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {reviewAction === 'reject' && (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  value={reviewRejectionReason}
                  onChange={(e) => onReviewRejectionReasonChange(e.target.value)}
                  placeholder="Explain why this cancellation request is being rejected..."
                  required
                  className="min-h-24 resize-y"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Comments (Optional)</Label>
              <Textarea
                value={reviewComments}
                onChange={(e) => onReviewCommentsChange(e.target.value)}
                placeholder="Add any review comments..."
                className="min-h-24 resize-y"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
