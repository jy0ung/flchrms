import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useCancelLeaveRequest, useAmendLeaveRequest, useProcessLeaveCancellationRequest, useUploadLeaveDocument } from '@/hooks/useLeaveRequests';
import { useLeavePreviewRequest } from '@/hooks/useLeaveCoreV2';
import { useLeaveRequestDetailsDialog } from '@/hooks/useLeaveRequestDetailsDialog';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Info } from 'lucide-react';
import { format } from 'date-fns';
import { LeavePreviewResult, LeaveRequest, LeaveStatus } from '@/types/hrms';
import { LeaveBalanceSection } from '@/components/leave/LeaveBalanceSection';
import { useLeaveDelegatedApprovalAccess } from '@/hooks/useLeaveDelegations';
import { LeaveRequestWizard } from '@/components/leave/LeaveRequestWizard';
import { LeaveDetailsDialog } from '@/components/leave/LeaveDetailsDialog';
import { LeaveCancellationDialogs } from '@/components/leave/LeaveCancellationDialogs';
import { LeaveActionDialog, type LeaveActionDialogAction } from '@/components/leave/LeaveActionDialog';
import { LeaveAmendDialog } from '@/components/leave/LeaveAmendDialog';
import { LeaveRequestWorkspace, type LeaveViewOption } from '@/components/leave/LeaveRequestWorkspace';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppPageContainer, DataTableShell, ModalScaffold, ModalSection, PageHeader, QueryErrorState } from '@/components/system';
import {
  canViewTeamLeaveRequests as canViewTeamLeaveRequestsPermission,
  isEmployee,
} from '@/lib/permissions';
import {
  canRoleHandleLeaveApprovalStage,
  canRoleApproveLeaveCancellationAtCurrentStage,
  getNextLeaveApprovalStageFromRouteSnapshot,
  LEAVE_APPROVAL_STAGE_LABELS,
  normalizeLeaveCancellationApprovalStages,
} from '@/lib/leave-workflow';
import { isCancellationPending } from '@/lib/leave-utils';

export default function Leave() {
  usePageTitle('Leave');
  const { role, user } = useAuth();
  const { data: requests, isLoading, isError, refetch } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: balances, refetch: refetchBalances } = useLeaveBalance();
  const { data: delegatedApprovalAccess } = useLeaveDelegatedApprovalAccess();
  const previewRequest = useLeavePreviewRequest();
  const createRequest = useCreateLeaveRequest();
  const approveRequest = useApproveLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();
  const processCancellationRequest = useProcessLeaveCancellationRequest();
  const amendRequest = useAmendLeaveRequest();
  const uploadDocument = useUploadLeaveDocument();
  
  const [open, setOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
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
  const {
    detailDialogOpen,
    detailRequest,
    detailEventsLoading,
    detailActorsLoading,
    detailApprovalTimelineEvents,
    detailCancellationTimelineEvents,
    getActorLabel,
    handleOpenDetails,
    handleDetailDialogOpenChange,
  } = useLeaveRequestDetailsDialog();

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    return format(new Date(value), 'PPp');
  };

  // Upload document helper for new requests - delegates to the shared hook
  const handleUploadDocument = async (file: File): Promise<string> => {
    return uploadDocument.mutateAsync({ file });
  };

  const handleSubmit = async (data: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
    document_url?: string;
  }) => {
    createRequest.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        refetchBalances();
      },
    });
  };

  const handlePreview = async (data: {
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
  };

  const handleAction = (request: LeaveRequest, action: LeaveActionDialogAction) => {
    setSelectedRequest(request);
    setActionType(action);
    setManagerComments('');
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  const submitAction = () => {
    if (!selectedRequest) return;
    
    approveRequest.mutate({
      requestId: selectedRequest.id,
      action: actionType,
      rejectionReason: actionType === 'reject' ? rejectionReason : undefined,
      documentRequired: actionType === 'request_document',
      managerComments: managerComments || undefined,
      currentStatus: selectedRequest.status,
    }, {
      onSuccess: () => {
        setActionDialogOpen(false);
        refetchBalances();
      },
    });
  };

  const handleAmend = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setAmendmentNotes('');
    setDocumentFile(null);
    setAmendDialogOpen(true);
  };

  const submitAmendment = async () => {
    if (!selectedRequest) return;

    let documentUrl: string | undefined;
    
    if (documentFile) {
      try {
        documentUrl = await uploadDocument.mutateAsync({
          file: documentFile,
          requestId: selectedRequest.id,
        });
      } catch {
        // uploadDocument.mutateAsync already triggers error toast via mutation config
        return;
      }
    }

    amendRequest.mutate({
      requestId: selectedRequest.id,
      amendmentNotes,
      documentUrl,
    }, {
      onSuccess: () => setAmendDialogOpen(false),
    });
  };

  const statusConfig: Record<LeaveStatus, { status: string; label: string }> = {
    pending: { status: 'pending', label: 'Pending' },
    manager_approved: { status: 'manager_approved', label: 'Awaiting Approval' },
    gm_approved: { status: 'gm_approved', label: 'Awaiting Approval' },
    director_approved: { status: 'approved', label: 'Approved' },
    hr_approved: { status: 'approved', label: 'Approved (Legacy)' },
    rejected: { status: 'rejected', label: 'Rejected' },
    cancelled: { status: 'cancelled', label: 'Cancelled' },
  };

  const getStatusDisplay = (request: LeaveRequest): { status: string; label: string } => {
    if (request.status === 'cancelled' || request.status === 'rejected') {
      return statusConfig[request.status];
    }

    if (request.final_approved_at) {
      return statusConfig.director_approved;
    }

    const nextApprovalStage = getNextLeaveApprovalStageFromRouteSnapshot({
      currentStatus: request.status,
      approvalRouteSnapshot: request.approval_route_snapshot,
    });

    if (nextApprovalStage) {
      const nextApprovalLabel = LEAVE_APPROVAL_STAGE_LABELS[nextApprovalStage];
      if (request.status === 'pending') {
        return { status: 'pending', label: `Pending ${nextApprovalLabel}` };
      }

      return { status: request.status, label: `Awaiting ${nextApprovalLabel}` };
    }

    return statusConfig[request.status];
  };

  const getCancellationNextStageLabel = (request: LeaveRequest) => {
    const route = (request.cancellation_route_snapshot || []).filter(
      (stage): stage is 'manager' | 'general_manager' | 'director' =>
        stage === 'manager' || stage === 'general_manager' || stage === 'director',
    );

    const labelMap = {
      manager: 'Manager',
      general_manager: 'GM',
      director: 'Director',
    } as const;

    if (request.cancellation_status === 'pending') {
      const nextStage = route[0];
      return nextStage ? labelMap[nextStage] : null;
    }

    const currentStageByStatus = {
      manager_approved: 'manager',
      gm_approved: 'general_manager',
      director_approved: 'director',
    } as const;

    if (
      request.cancellation_status === 'manager_approved' ||
      request.cancellation_status === 'gm_approved' ||
      request.cancellation_status === 'director_approved'
    ) {
      const currentStage = currentStageByStatus[request.cancellation_status];
      const currentIdx = route.indexOf(currentStage);
      const nextStage = currentIdx >= 0 ? route[currentIdx + 1] : null;
      return nextStage ? labelMap[nextStage] : null;
    }

    return null;
  };

  const getCancellationBadge = (request: LeaveRequest) => {
    if (!request.cancellation_status) return null;

    if (request.cancellation_status === 'rejected') {
      return {
        status: 'rejected',
        label: 'Cancellation Rejected',
      };
    }

    if (request.cancellation_status === 'approved') {
      return {
        status: 'cancelled',
        label: 'Cancellation Approved',
      };
    }

    if (isCancellationPending(request)) {
      const nextStage = getCancellationNextStageLabel(request);
      return {
        status: 'pending',
        label: nextStage ? `Cancellation Pending ${nextStage}` : 'Cancellation Pending',
      };
    }

    return null;
  };

  const canApprove = (request: LeaveRequest) => {
    if (isCancellationPending(request)) return false;
    if (request.final_approved_at || request.status === 'rejected' || request.status === 'cancelled') return false;

    const nextApprovalStage = getNextLeaveApprovalStageFromRouteSnapshot({
      currentStatus: request.status,
      approvalRouteSnapshot: request.approval_route_snapshot,
    });

    if (canRoleHandleLeaveApprovalStage(role, nextApprovalStage)) return true;

    if (!nextApprovalStage) return false;
    if (!delegatedApprovalAccess?.hasAny) return false;

    if (nextApprovalStage === 'manager') return delegatedApprovalAccess.manager;
    if (nextApprovalStage === 'general_manager') return delegatedApprovalAccess.generalManager;
    return delegatedApprovalAccess.director;
  };

  const canAmend = (request: LeaveRequest) => {
    return request.employee_id === user?.id && (request.status === 'rejected' || (request.status === 'pending' && request.document_required));
  };

  const isHistoricalRequest = useCallback((request: LeaveRequest) =>
    !isCancellationPending(request) && (!!request.final_approved_at || request.status === 'rejected' || request.status === 'cancelled'),
  []);

  const canCancelPendingRequest = (request: LeaveRequest) =>
    request.employee_id === user?.id &&
    request.status === 'pending' &&
    !request.document_required;

  const canRequestCancellation = (request: LeaveRequest) =>
    request.employee_id === user?.id &&
    !!request.final_approved_at &&
    request.status !== 'cancelled' &&
    !isCancellationPending(request);

  const canApproveCancellation = (request: LeaveRequest) => {
    if (!role) return false;
    if (!isCancellationPending(request)) return false;
    if (request.status === 'cancelled' || !request.final_approved_at) return false;

    // Resolve workflow stages from the route snapshot (persisted at cancellation-request time)
    const workflowStages = normalizeLeaveCancellationApprovalStages(
      request.cancellation_route_snapshot ?? undefined,
    );

    // Determine the requester role (approximate from employee_id or default to 'employee')
    const requesterRole = 'employee' as const;

    return canRoleApproveLeaveCancellationAtCurrentStage({
      approverRole: role,
      currentCancellationStatus: request.cancellation_status!,
      requesterRole,
      workflowStages: workflowStages.length > 0 ? workflowStages : undefined,
    });
  };

  const handleCancellation = (request: LeaveRequest) => {
    if (request.status === 'cancelled') return;

    setCancellationDialogRequest(request);
    setCancellationDialogMode(request.final_approved_at ? 'request_approved_cancel' : 'pending_cancel');
    setCancellationRequestReason('');
    setCancellationDialogOpen(true);
  };

  const handleCancellationReview = (request: LeaveRequest, action: 'approve' | 'reject') => {
    if (!canApproveCancellation(request)) return;

    setCancellationReviewRequest(request);
    setCancellationReviewAction(action);
    setCancellationReviewComments('');
    setCancellationReviewRejectionReason('');
    setCancellationReviewDialogOpen(true);
  };

  const submitCancellationRequest = () => {
    if (!cancellationDialogRequest) return;

    const requiresReason = cancellationDialogMode === 'request_approved_cancel';
    const reason = cancellationRequestReason.trim();

    if (requiresReason && !reason) return;

    cancelRequest.mutate(
      {
        requestId: cancellationDialogRequest.id,
        reason: requiresReason ? reason : undefined,
      },
      {
        onSuccess: () => {
          setCancellationDialogOpen(false);
          setCancellationDialogRequest(null);
          setCancellationRequestReason('');
        },
      },
    );
  };

  const submitCancellationReview = () => {
    if (!cancellationReviewRequest) return;

    const rejectionReason = cancellationReviewRejectionReason.trim();
    const comments = cancellationReviewComments.trim();

    if (cancellationReviewAction === 'reject' && !rejectionReason) return;

    processCancellationRequest.mutate(
      {
        requestId: cancellationReviewRequest.id,
        action: cancellationReviewAction,
        rejectionReason: cancellationReviewAction === 'reject' ? rejectionReason : undefined,
        comments: comments || undefined,
      },
      {
        onSuccess: () => {
          setCancellationReviewDialogOpen(false);
          setCancellationReviewRequest(null);
          setCancellationReviewComments('');
          setCancellationReviewRejectionReason('');
        },
      },
    );
  };

  const shouldShowLeaveDetailsButton = (request: LeaveRequest) =>
    !!request.final_approved_at ||
    !!request.rejected_at ||
    request.status === 'cancelled' ||
    !!request.cancellation_status;

  // Filter own requests vs team requests for display
  const myRequests = useMemo(() => 
    requests?.filter(r => r.employee_id === user?.id) || [],
    [requests, user?.id]
  );

  const canViewRequestAtCurrentApprovalStage = useCallback((request: LeaveRequest) => {
    if (!role) return false;

    if (role === 'hr' || role === 'admin') return true;

    // Keep cancellation visibility behavior unchanged.
    if (isCancellationPending(request)) return true;

    if (isHistoricalRequest(request)) return true;

    const nextApprovalStage = getNextLeaveApprovalStageFromRouteSnapshot({
      currentStatus: request.status,
      approvalRouteSnapshot: request.approval_route_snapshot,
    });

    if (canRoleHandleLeaveApprovalStage(role, nextApprovalStage)) return true;

    if (!nextApprovalStage || !delegatedApprovalAccess?.hasAny) return false;
    if (nextApprovalStage === 'manager') return delegatedApprovalAccess.manager;
    if (nextApprovalStage === 'general_manager') return delegatedApprovalAccess.generalManager;
    return delegatedApprovalAccess.director;
  }, [delegatedApprovalAccess, isCancellationPending, isHistoricalRequest, role]);

  const teamRequests = useMemo(() =>
    requests?.filter((request) =>
      request.employee_id !== user?.id && canViewRequestAtCurrentApprovalStage(request),
    ) || [],
    [canViewRequestAtCurrentApprovalStage, requests, user?.id]
  );

  const myCurrentRequests = useMemo(
    () => myRequests.filter((request) => !isHistoricalRequest(request)),
    [myRequests, isHistoricalRequest]
  );

  const myHistoryRequests = useMemo(
    () => myRequests.filter((request) => isHistoricalRequest(request)),
    [myRequests, isHistoricalRequest]
  );

  const teamCurrentRequests = useMemo(
    () => teamRequests.filter((request) => !isHistoricalRequest(request)),
    [teamRequests, isHistoricalRequest]
  );

  const teamHistoryRequests = useMemo(
    () => teamRequests.filter((request) => isHistoricalRequest(request)),
    [teamRequests, isHistoricalRequest]
  );

  const canViewTeamRequests =
    canViewTeamLeaveRequestsPermission(role) || Boolean(delegatedApprovalAccess?.hasAny);
  const defaultWorkspaceView: LeaveViewOption =
    canViewTeamRequests && myRequests.length === 0 && teamRequests.length > 0
      ? 'TEAM_CURRENT'
      : 'MY_CURRENT';

  const workflowInfoPopover = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Approval workflow examples"
        >
          <Info className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,26rem)]" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Approval Workflow (Configurable)</h4>
          <p className="text-[11px] text-muted-foreground">
            Examples below. Actual approval routes follow the workflow profile saved by HR/Admin/Director.
          </p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="space-y-1">
              <span className="font-medium text-foreground">Employee:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600">Submit</Badge>
                <span>→</span>
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">Manager</Badge>
                <span>→</span>
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600">GM</Badge>
                <span>→</span>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Director</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-foreground">Manager:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">Submit</Badge>
                <span>→</span>
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600">GM</Badge>
                <span>→</span>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Director</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-foreground">GM:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600">Submit</Badge>
                <span>→</span>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Director</Badge>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <AppPageContainer maxWidth="7xl">
      <PageHeader
        title="Leave Management"
        description={isEmployee(role) ? 'Your leave requests and balance' : 'Manage leave requests'}
        actions={[
          {
            id: 'request-leave',
            label: 'Request Leave',
            icon: Plus,
            onClick: () => setOpen(true),
            variant: 'default',
          },
        ]}
      />

      {isError && (
        <QueryErrorState label="leave requests" onRetry={() => refetch()} />
      )}

      <ModalScaffold
        open={open}
        onOpenChange={setOpen}
        title="New Leave Request"
        description="Submit a new leave request for approval"
        maxWidth="3xl"
        body={
          <LeaveRequestWizard
            leaveTypes={leaveTypes}
            balances={balances}
            onSubmit={handleSubmit}
            onPreview={handlePreview}
            onUploadDocument={handleUploadDocument}
            onCancel={() => setOpen(false)}
            isPending={createRequest.isPending || previewRequest.isPending}
            isPreviewPending={previewRequest.isPending}
          />
        }
        showCloseButton
      />

      <LeaveBalanceSection balances={balances ?? []} />

      {/* Loading state */}
      {isLoading && (
        <DataTableShell
          title="Leave Requests"
          loading
          loadingSkeleton={
            <div className="p-4 text-center text-muted-foreground">
              Loading leave requests...
            </div>
          }
        />
      )}

      {!isLoading && (
        <LeaveRequestWorkspace
          role={role}
          canViewTeamRequests={canViewTeamRequests}
          myCurrentRequests={myCurrentRequests}
          myHistoryRequests={myHistoryRequests}
          teamCurrentRequests={teamCurrentRequests}
          teamHistoryRequests={teamHistoryRequests}
          defaultView={defaultWorkspaceView}
          getStatusDisplay={getStatusDisplay}
          getCancellationBadge={getCancellationBadge}
          canAmend={canAmend}
          canCancelPendingRequest={canCancelPendingRequest}
          canRequestCancellation={canRequestCancellation}
          canApproveCancellation={canApproveCancellation}
          canApprove={canApprove}
          shouldShowLeaveDetailsButton={shouldShowLeaveDetailsButton}
          onAmend={handleAmend}
          onCancel={handleCancellation}
          onOpenDetails={(request) => void handleOpenDetails(request)}
          onCancellationReview={handleCancellationReview}
          onAction={handleAction}
          workflowInfoPopover={workflowInfoPopover}
        />
      )}

      <LeaveDetailsDialog
        open={detailDialogOpen}
        onOpenChange={handleDetailDialogOpenChange}
        request={detailRequest}
        role={role}
        actorsLoading={detailActorsLoading}
        eventsLoading={detailEventsLoading}
        approvalTimelineEvents={detailApprovalTimelineEvents}
        cancellationTimelineEvents={detailCancellationTimelineEvents}
        formatDateTime={formatDateTime}
        getActorLabel={getActorLabel}
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={getCancellationBadge}
      />

      <LeaveActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        request={selectedRequest}
        actionType={actionType}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        managerComments={managerComments}
        onManagerCommentsChange={setManagerComments}
        onSubmit={submitAction}
        isPending={approveRequest.isPending}
      />

      <LeaveAmendDialog
        open={amendDialogOpen}
        onOpenChange={setAmendDialogOpen}
        request={selectedRequest}
        amendmentNotes={amendmentNotes}
        onAmendmentNotesChange={setAmendmentNotes}
        onDocumentFileChange={setDocumentFile}
        onSubmit={submitAmendment}
        isPending={amendRequest.isPending}
        isUploading={uploadDocument.isPending}
      />

      <LeaveCancellationDialogs
        requestDialogOpen={cancellationDialogOpen}
        onRequestDialogOpenChange={(openState) => {
          setCancellationDialogOpen(openState);
          if (!openState) {
            setCancellationDialogRequest(null);
            setCancellationRequestReason('');
          }
        }}
        requestDialogRequest={cancellationDialogRequest}
        requestDialogMode={cancellationDialogMode}
        requestReason={cancellationRequestReason}
        onRequestReasonChange={setCancellationRequestReason}
        onSubmitRequest={submitCancellationRequest}
        requestSubmitPending={cancelRequest.isPending}
        reviewDialogOpen={cancellationReviewDialogOpen}
        onReviewDialogOpenChange={(openState) => {
          setCancellationReviewDialogOpen(openState);
          if (!openState) {
            setCancellationReviewRequest(null);
            setCancellationReviewComments('');
            setCancellationReviewRejectionReason('');
          }
        }}
        reviewDialogRequest={cancellationReviewRequest}
        reviewAction={cancellationReviewAction}
        reviewComments={cancellationReviewComments}
        onReviewCommentsChange={setCancellationReviewComments}
        reviewRejectionReason={cancellationReviewRejectionReason}
        onReviewRejectionReasonChange={setCancellationReviewRejectionReason}
        onSubmitReview={submitCancellationReview}
        reviewSubmitPending={processCancellationRequest.isPending}
      />
    </AppPageContainer>
  );
}
