import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveRequest } from '@/types/hrms';

export type LeaveActionDialogAction = 'approve' | 'reject' | 'request_document';

interface LeaveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
  actionType: LeaveActionDialogAction;
  rejectionReason: string;
  onRejectionReasonChange: (value: string) => void;
  managerComments: string;
  onManagerCommentsChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function LeaveActionDialog({
  open,
  onOpenChange,
  request,
  actionType,
  rejectionReason,
  onRejectionReasonChange,
  managerComments,
  onManagerCommentsChange,
  onSubmit,
  isPending,
}: LeaveActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {actionType === 'approve' && 'Approve Leave Request'}
            {actionType === 'reject' && 'Reject Leave Request'}
            {actionType === 'request_document' && 'Request Supporting Document'}
          </DialogTitle>
          <DialogDescription>
            {request?.employee?.first_name} {request?.employee?.last_name} - {request?.leave_type?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="min-h-24 resize-y"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{actionType === 'request_document' ? 'Document Request Message' : 'Comments (Optional)'}</Label>
            <Textarea
              value={managerComments}
              onChange={(e) => onManagerCommentsChange(e.target.value)}
              placeholder={actionType === 'request_document' ? 'Specify what documents are needed...' : 'Add any comments...'}
              className="min-h-24 resize-y"
            />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={isPending}
            variant={actionType === 'reject' ? 'destructive' : 'default'}
            className="w-full sm:w-auto"
          >
            {actionType === 'approve' && 'Approve'}
            {actionType === 'reject' && 'Reject'}
            {actionType === 'request_document' && 'Request Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
