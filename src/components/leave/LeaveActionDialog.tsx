import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveRequest } from '@/types/hrms';
import { getLeaveRequestDialogDescription } from '@/lib/leave-request-display';
import { ModalScaffold, ModalSection } from '@/components/system';

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
    <ModalScaffold
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="xl"
      mobileLayout="full-screen"
      title={
        actionType === 'approve'
          ? 'Approve Leave Request'
          : actionType === 'reject'
            ? 'Reject Leave Request'
            : 'Request Supporting Document'
      }
      description={getLeaveRequestDialogDescription(request)}
      body={
        <div className="space-y-4">
          {actionType === 'reject' && (
            <ModalSection title="Rejection Reason" tone="danger">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="min-h-24 resize-y"
              />
            </ModalSection>
          )}
          <ModalSection
            title={actionType === 'request_document' ? 'Document Request Message' : 'Comments'}
            description={actionType === 'request_document' ? 'Specify what documents are needed for review.' : 'Optional notes for the requester.'}
            tone={actionType === 'request_document' ? 'warning' : 'default'}
          >
            <Label>{actionType === 'request_document' ? 'Document Request Message' : 'Comments (Optional)'}</Label>
            <Textarea
              value={managerComments}
              onChange={(e) => onManagerCommentsChange(e.target.value)}
              placeholder={actionType === 'request_document' ? 'Specify what documents are needed...' : 'Add any comments...'}
              className="min-h-24 resize-y"
            />
          </ModalSection>
        </div>
      }
      footer={
        <>
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
        </>
      }
    />
  );
}
