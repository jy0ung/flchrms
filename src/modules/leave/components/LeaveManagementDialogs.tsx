import { ModalScaffold } from '@/components/system';
import { LeaveActionDialog } from '@/components/leave/LeaveActionDialog';
import { LeaveAmendDialog } from '@/components/leave/LeaveAmendDialog';
import { LeaveCancellationDialogs } from '@/components/leave/LeaveCancellationDialogs';
import { LeaveRequestWizard } from '@/components/leave/LeaveRequestWizard';
import type { LeaveType } from '@/types/hrms';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import type { useLeaveWorkflowController } from '@/modules/leave/hooks/useLeaveWorkflowController';

type LeaveWorkflowController = ReturnType<typeof useLeaveWorkflowController>;

interface LeaveManagementDialogsProps {
  controller: LeaveWorkflowController;
  leaveTypes: LeaveType[] | undefined;
  balances: LeaveBalance[] | undefined;
}

export function LeaveManagementDialogs({
  controller,
  leaveTypes,
  balances,
}: LeaveManagementDialogsProps) {
  return (
    <>
      <ModalScaffold
        open={controller.requestWizardOpen}
        onOpenChange={controller.handleRequestWizardOpenChange}
        title="New Leave Request"
        description="Submit a new leave request for approval"
        maxWidth="3xl"
        mobileLayout="full-screen"
        body={(
          <LeaveRequestWizard
            leaveTypes={leaveTypes}
            balances={balances}
            onSubmit={controller.handleSubmitRequest}
            onPreview={controller.handlePreview}
            onUploadDocument={controller.handleUploadDocument}
            onCancel={() => controller.handleRequestWizardOpenChange(false)}
            isPending={controller.createPending || controller.previewPending}
            isPreviewPending={controller.previewPending}
          />
        )}
        showCloseButton
      />

      <LeaveActionDialog
        open={controller.actionDialogOpen}
        onOpenChange={controller.handleActionDialogOpenChange}
        request={controller.selectedRequest}
        actionType={controller.actionType}
        rejectionReason={controller.rejectionReason}
        onRejectionReasonChange={controller.setRejectionReason}
        managerComments={controller.managerComments}
        onManagerCommentsChange={controller.setManagerComments}
        onSubmit={controller.submitAction}
        isPending={controller.actionPending}
      />

      <LeaveAmendDialog
        open={controller.amendDialogOpen}
        onOpenChange={controller.handleAmendDialogOpenChange}
        request={controller.selectedRequest}
        amendmentNotes={controller.amendmentNotes}
        onAmendmentNotesChange={controller.setAmendmentNotes}
        onDocumentFileChange={controller.setDocumentFile}
        onSubmit={controller.submitAmendment}
        isPending={controller.amendPending}
        isUploading={controller.uploadPending}
      />

      <LeaveCancellationDialogs
        requestDialogOpen={controller.cancellationDialogOpen}
        onRequestDialogOpenChange={controller.handleCancellationDialogOpenChange}
        requestDialogRequest={controller.cancellationDialogRequest}
        requestDialogMode={controller.cancellationDialogMode}
        requestReason={controller.cancellationRequestReason}
        onRequestReasonChange={controller.setCancellationRequestReason}
        onSubmitRequest={controller.submitCancellationRequest}
        requestSubmitPending={controller.cancellationPending}
        reviewDialogOpen={controller.cancellationReviewDialogOpen}
        onReviewDialogOpenChange={controller.handleCancellationReviewDialogOpenChange}
        reviewDialogRequest={controller.cancellationReviewRequest}
        reviewAction={controller.cancellationReviewAction}
        reviewComments={controller.cancellationReviewComments}
        onReviewCommentsChange={controller.setCancellationReviewComments}
        reviewRejectionReason={controller.cancellationReviewRejectionReason}
        onReviewRejectionReasonChange={controller.setCancellationReviewRejectionReason}
        onSubmitReview={controller.submitCancellationReview}
        reviewSubmitPending={controller.cancellationReviewPending}
      />
    </>
  );
}
