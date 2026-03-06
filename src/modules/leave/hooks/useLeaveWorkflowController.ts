import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useLeavePreviewRequest } from '@/hooks/useLeaveCoreV2';
import {
  useAmendLeaveRequest,
  useApproveLeaveRequest,
  useCancelLeaveRequest,
  useCreateLeaveRequest,
  useProcessLeaveCancellationRequest,
  useUploadLeaveDocument,
} from '@/hooks/useLeaveRequests';
import type { LeavePreviewResult, LeaveRequest } from '@/types/hrms';

import type { LeaveRowActionPermissions } from '@/modules/leave/types';
import type { LeaveActionDialogAction } from '@/components/leave/LeaveActionDialog';

interface UseLeaveWorkflowControllerOptions {
  getRowPermissions: (request: LeaveRequest) => LeaveRowActionPermissions;
}

export function useLeaveWorkflowController({ getRowPermissions }: UseLeaveWorkflowControllerOptions) {
  const { user } = useAuth();
  const previewRequest = useLeavePreviewRequest();
  const createRequest = useCreateLeaveRequest();
  const approveRequest = useApproveLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();
  const processCancellationRequest = useProcessLeaveCancellationRequest();
  const amendRequest = useAmendLeaveRequest();
  const uploadDocument = useUploadLeaveDocument();

  const [requestWizardOpen, setRequestWizardOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [cancellationDialogRequest, setCancellationDialogRequest] = useState<LeaveRequest | null>(null);
  const [cancellationDialogMode, setCancellationDialogMode] = useState<'pending_cancel' | 'request_approved_cancel'>('pending_cancel');
  const [cancellationRequestReason, setCancellationRequestReason] = useState('');
  const [cancellationReviewDialogOpen, setCancellationReviewDialogOpen] = useState(false);
  const [cancellationReviewRequest, setCancellationReviewRequest] = useState<LeaveRequest | null>(null);
  const [cancellationReviewAction, setCancellationReviewAction] = useState<'approve' | 'reject'>('approve');
  const [cancellationReviewComments, setCancellationReviewComments] = useState('');
  const [cancellationReviewRejectionReason, setCancellationReviewRejectionReason] = useState('');
  const [actionType, setActionType] = useState<LeaveActionDialogAction>('approve');
  const [managerComments, setManagerComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [amendmentNotes, setAmendmentNotes] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const rejectIfUnauthorized = useCallback((condition: boolean) => {
    if (!condition) return false;
    toast.error('You do not have permission to perform this action.');
    return true;
  }, []);

  const openRequestWizard = useCallback(() => {
    setRequestWizardOpen(true);
  }, []);

  const handleRequestWizardOpenChange = useCallback((open: boolean) => {
    setRequestWizardOpen(open);
  }, []);

  const handlePreview = useCallback(async (data: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
  }): Promise<LeavePreviewResult> => {
    if (!user?.id) {
      throw new Error('Authentication required.');
    }

    return previewRequest.mutateAsync({
      employeeId: user.id,
      leaveTypeId: data.leave_type_id,
      startDate: data.start_date,
      endDate: data.end_date,
      daysCount: data.days_count,
      reason: data.reason,
    });
  }, [previewRequest, user?.id]);

  const handleUploadDocument = useCallback(async (file: File): Promise<string> => {
    return uploadDocument.mutateAsync({ file });
  }, [uploadDocument]);

  const handleSubmitRequest = useCallback((data: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
    document_url?: string;
  }) => {
    createRequest.mutate(data, {
      onSuccess: () => {
        setRequestWizardOpen(false);
      },
    });
  }, [createRequest]);

  const openActionDialog = useCallback((request: LeaveRequest, action: LeaveActionDialogAction) => {
    const permissions = getRowPermissions(request);
    const isUnauthorized = action === 'request_document'
      ? !permissions.canRequestDocument
      : !permissions.canApprove;

    if (rejectIfUnauthorized(isUnauthorized)) return;

    setSelectedRequest(request);
    setActionType(action);
    setManagerComments('');
    setRejectionReason('');
    setActionDialogOpen(true);
  }, [getRowPermissions, rejectIfUnauthorized]);

  const handleActionDialogOpenChange = useCallback((open: boolean) => {
    setActionDialogOpen(open);
    if (!open) {
      setSelectedRequest(null);
      setActionType('approve');
      setManagerComments('');
      setRejectionReason('');
    }
  }, []);

  const submitAction = useCallback(() => {
    if (!selectedRequest) return;

    const permissions = getRowPermissions(selectedRequest);
    const isUnauthorized = actionType === 'request_document'
      ? !permissions.canRequestDocument
      : !permissions.canApprove;

    if (rejectIfUnauthorized(isUnauthorized)) return;

    approveRequest.mutate({
      requestId: selectedRequest.id,
      action: actionType,
      rejectionReason: actionType === 'reject' ? rejectionReason : undefined,
      documentRequired: actionType === 'request_document',
      managerComments: managerComments || undefined,
      currentStatus: selectedRequest.status,
    }, {
      onSuccess: () => {
        handleActionDialogOpenChange(false);
      },
    });
  }, [actionType, approveRequest, getRowPermissions, handleActionDialogOpenChange, managerComments, rejectionReason, rejectIfUnauthorized, selectedRequest]);

  const openAmendDialog = useCallback((request: LeaveRequest) => {
    if (rejectIfUnauthorized(!getRowPermissions(request).canAmend)) return;

    setSelectedRequest(request);
    setAmendmentNotes('');
    setDocumentFile(null);
    setAmendDialogOpen(true);
  }, [getRowPermissions, rejectIfUnauthorized]);

  const handleAmendDialogOpenChange = useCallback((open: boolean) => {
    setAmendDialogOpen(open);
    if (!open) {
      setSelectedRequest(null);
      setAmendmentNotes('');
      setDocumentFile(null);
    }
  }, []);

  const submitAmendment = useCallback(async () => {
    if (!selectedRequest) return;
    if (rejectIfUnauthorized(!getRowPermissions(selectedRequest).canAmend)) return;

    let documentUrl: string | undefined;

    if (documentFile) {
      try {
        documentUrl = await uploadDocument.mutateAsync({
          file: documentFile,
          requestId: selectedRequest.id,
        });
      } catch {
        return;
      }
    }

    amendRequest.mutate({
      requestId: selectedRequest.id,
      amendmentNotes,
      documentUrl,
    }, {
      onSuccess: () => {
        handleAmendDialogOpenChange(false);
      },
    });
  }, [amendRequest, amendmentNotes, documentFile, getRowPermissions, handleAmendDialogOpenChange, rejectIfUnauthorized, selectedRequest, uploadDocument]);

  const openCancellationDialog = useCallback((request: LeaveRequest) => {
    const permissions = getRowPermissions(request);
    if (rejectIfUnauthorized(!permissions.canCancelPending && !permissions.canRequestCancellation)) return;

    setCancellationDialogRequest(request);
    setCancellationDialogMode(request.final_approved_at ? 'request_approved_cancel' : 'pending_cancel');
    setCancellationRequestReason('');
    setCancellationDialogOpen(true);
  }, [getRowPermissions, rejectIfUnauthorized]);

  const handleCancellationDialogOpenChange = useCallback((open: boolean) => {
    setCancellationDialogOpen(open);
    if (!open) {
      setCancellationDialogRequest(null);
      setCancellationRequestReason('');
    }
  }, []);

  const submitCancellationRequest = useCallback(() => {
    if (!cancellationDialogRequest) return;
    const permissions = getRowPermissions(cancellationDialogRequest);
    if (rejectIfUnauthorized(!permissions.canCancelPending && !permissions.canRequestCancellation)) return;

    const requiresReason = cancellationDialogMode === 'request_approved_cancel';
    const reason = cancellationRequestReason.trim();
    if (requiresReason && !reason) return;

    cancelRequest.mutate({
      requestId: cancellationDialogRequest.id,
      reason: requiresReason ? reason : undefined,
    }, {
      onSuccess: () => {
        handleCancellationDialogOpenChange(false);
      },
    });
  }, [cancelRequest, cancellationDialogMode, cancellationDialogRequest, cancellationRequestReason, getRowPermissions, handleCancellationDialogOpenChange, rejectIfUnauthorized]);

  const openCancellationReviewDialog = useCallback((request: LeaveRequest, action: 'approve' | 'reject') => {
    if (rejectIfUnauthorized(!getRowPermissions(request).canApproveCancellation)) return;

    setCancellationReviewRequest(request);
    setCancellationReviewAction(action);
    setCancellationReviewComments('');
    setCancellationReviewRejectionReason('');
    setCancellationReviewDialogOpen(true);
  }, [getRowPermissions, rejectIfUnauthorized]);

  const handleCancellationReviewDialogOpenChange = useCallback((open: boolean) => {
    setCancellationReviewDialogOpen(open);
    if (!open) {
      setCancellationReviewRequest(null);
      setCancellationReviewComments('');
      setCancellationReviewRejectionReason('');
    }
  }, []);

  const submitCancellationReview = useCallback(() => {
    if (!cancellationReviewRequest) return;
    if (rejectIfUnauthorized(!getRowPermissions(cancellationReviewRequest).canApproveCancellation)) return;

    const comments = cancellationReviewComments.trim();
    const rejection = cancellationReviewRejectionReason.trim();
    if (cancellationReviewAction === 'reject' && !rejection) return;

    processCancellationRequest.mutate({
      requestId: cancellationReviewRequest.id,
      action: cancellationReviewAction,
      rejectionReason: cancellationReviewAction === 'reject' ? rejection : undefined,
      comments: comments || undefined,
    }, {
      onSuccess: () => {
        handleCancellationReviewDialogOpenChange(false);
      },
    });
  }, [cancellationReviewAction, cancellationReviewComments, cancellationReviewRejectionReason, cancellationReviewRequest, getRowPermissions, handleCancellationReviewDialogOpenChange, processCancellationRequest, rejectIfUnauthorized]);

  return {
    requestWizardOpen,
    actionDialogOpen,
    amendDialogOpen,
    selectedRequest,
    cancellationDialogOpen,
    cancellationDialogRequest,
    cancellationDialogMode,
    cancellationRequestReason,
    cancellationReviewDialogOpen,
    cancellationReviewRequest,
    cancellationReviewAction,
    cancellationReviewComments,
    cancellationReviewRejectionReason,
    actionType,
    managerComments,
    rejectionReason,
    amendmentNotes,
    documentFile,
    createPending: createRequest.isPending,
    previewPending: previewRequest.isPending,
    actionPending: approveRequest.isPending,
    amendPending: amendRequest.isPending,
    uploadPending: uploadDocument.isPending,
    cancellationPending: cancelRequest.isPending,
    cancellationReviewPending: processCancellationRequest.isPending,
    openRequestWizard,
    handleRequestWizardOpenChange,
    handlePreview,
    handleUploadDocument,
    handleSubmitRequest,
    openActionDialog,
    handleActionDialogOpenChange,
    submitAction,
    openAmendDialog,
    handleAmendDialogOpenChange,
    submitAmendment,
    openCancellationDialog,
    handleCancellationDialogOpenChange,
    submitCancellationRequest,
    openCancellationReviewDialog,
    handleCancellationReviewDialogOpenChange,
    submitCancellationReview,
    setManagerComments,
    setRejectionReason,
    setAmendmentNotes,
    setDocumentFile,
    setCancellationRequestReason,
    setCancellationReviewComments,
    setCancellationReviewRejectionReason,
  };
}
