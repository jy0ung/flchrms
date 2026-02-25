import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useCancelLeaveRequest, useAmendLeaveRequest, useProcessLeaveCancellationRequest, useUploadLeaveDocument } from '@/hooks/useLeaveRequests';
import { useLeaveRequestDetailsDialog } from '@/hooks/useLeaveRequestDetailsDialog';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Plus, X, Clock, CheckCircle2, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { LeaveRequest, LeaveStatus } from '@/types/hrms';
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { LeaveDetailsDialog } from '@/components/leave/LeaveDetailsDialog';
import { LeaveCancellationDialogs } from '@/components/leave/LeaveCancellationDialogs';
import { LeaveActionDialog, type LeaveActionDialogAction } from '@/components/leave/LeaveActionDialog';
import { LeaveAmendDialog } from '@/components/leave/LeaveAmendDialog';
import { MyLeaveRequestsTable } from '@/components/leave/MyLeaveRequestsTable';
import { TeamLeaveRequestsTable } from '@/components/leave/TeamLeaveRequestsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  canViewTeamLeaveRequests as canViewTeamLeaveRequestsPermission,
  isDirector,
  isEmployee,
  isGeneralManager,
  isManager,
} from '@/lib/permissions';

export default function Leave() {
  const { role, user } = useAuth();
  const { data: requests, isLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: balances, refetch: refetchBalances } = useLeaveBalance();
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
  const [myLeaveView, setMyLeaveView] = useState<'current' | 'history'>('current');
  const [teamLeaveView, setTeamLeaveView] = useState<'current' | 'history'>('current');
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

  // Upload document helper for new requests - uses user ID folder for RLS compliance
  const handleUploadDocument = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    const fileExt = file.name.split('.').pop();
    // Use user ID as folder for RLS policy compliance
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('leave-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Store the file path instead of URL - signed URLs will be generated on demand
    return filePath;
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
      documentUrl = await uploadDocument.mutateAsync({
        file: documentFile,
        requestId: selectedRequest.id,
      });
    }

    amendRequest.mutate({
      requestId: selectedRequest.id,
      amendmentNotes,
      documentUrl,
    }, {
      onSuccess: () => setAmendDialogOpen(false),
    });
  };

  const statusConfig: Record<LeaveStatus, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', icon: <Clock className="w-3 h-3" />, label: 'Pending Manager' },
    manager_approved: { color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Awaiting GM' },
    gm_approved: { color: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Awaiting Director' },
    director_approved: { color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approved' },
    hr_approved: { color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approved (Legacy)' },
    rejected: { color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
    cancelled: { color: 'bg-muted text-muted-foreground', icon: <X className="w-3 h-3" />, label: 'Cancelled' },
  };

  const getStatusDisplay = (request: LeaveRequest) => {
    if (request.status === 'cancelled' || request.status === 'rejected') {
      return statusConfig[request.status];
    }

    if (request.final_approved_at) {
      return statusConfig.director_approved;
    }

    return statusConfig[request.status];
  };

  const isCancellationPending = useCallback((request: LeaveRequest) =>
    request.cancellation_status === 'pending' ||
    request.cancellation_status === 'manager_approved' ||
    request.cancellation_status === 'gm_approved' ||
    request.cancellation_status === 'director_approved', []);

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
        className: 'mt-1 text-red-500 border-red-500/30',
        label: 'Cancellation Rejected',
      };
    }

    if (request.cancellation_status === 'approved') {
      return {
        className: 'mt-1 text-muted-foreground border-border',
        label: 'Cancellation Approved',
      };
    }

    if (isCancellationPending(request)) {
      const nextStage = getCancellationNextStageLabel(request);
      return {
        className: 'mt-1 text-amber-600 border-amber-500/30',
        label: nextStage ? `Cancellation Pending ${nextStage}` : 'Cancellation Pending',
      };
    }

    return null;
  };

  const canApprove = (request: LeaveRequest) => {
    if (isCancellationPending(request)) return false;
    if (request.final_approved_at || request.status === 'rejected' || request.status === 'cancelled') return false;

    // Multi-level approval workflow (route-specific and validated server-side using
    // the request's workflow snapshot). These UI checks stay intentionally broad.

    // Manager can approve pending requests
    if (isManager(role) && request.status === 'pending') return true;
    
    // GM can approve manager_approved requests (or pending if the employee is a manager)
    if (isGeneralManager(role) && (request.status === 'manager_approved' || request.status === 'pending')) return true;
    
    // Director can approve final-stage requests; allow pending here to cover routes
    // that start directly at Director (e.g. HR/Admin/Director requester profiles).
    if (isDirector(role) && (request.status === 'gm_approved' || request.status === 'pending')) return true;
    
    return false;
  };

  const canAmend = (request: LeaveRequest) => {
    return request.employee_id === user?.id && (request.status === 'rejected' || (request.status === 'pending' && request.document_required));
  };

  const isHistoricalRequest = useCallback((request: LeaveRequest) =>
    !isCancellationPending(request) && (!!request.final_approved_at || request.status === 'rejected' || request.status === 'cancelled'),
  [isCancellationPending]);

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
    if (!isCancellationPending(request)) return false;
    if (request.status === 'cancelled' || !request.final_approved_at) return false;

    if (isManager(role) && request.cancellation_status === 'pending') return true;
    if (isGeneralManager(role) && (request.cancellation_status === 'pending' || request.cancellation_status === 'manager_approved')) return true;
    if (isDirector(role) && (
      request.cancellation_status === 'pending' ||
      request.cancellation_status === 'gm_approved'
    )) return true;

    return false;
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

  const teamRequests = useMemo(() => 
    requests?.filter(r => r.employee_id !== user?.id) || [],
    [requests, user?.id]
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

  const visibleMyRequests = myLeaveView === 'history' ? myHistoryRequests : myCurrentRequests;
  const visibleTeamRequests = teamLeaveView === 'history' ? teamHistoryRequests : teamCurrentRequests;

  const canViewTeamRequests = canViewTeamLeaveRequestsPermission(role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-accent" />
            Leave Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEmployee(role) ? 'Your leave requests and balance' : 'Manage leave requests'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Request Leave</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
              <DialogDescription>Submit a new leave request for approval</DialogDescription>
            </DialogHeader>
            <LeaveRequestForm
              leaveTypes={leaveTypes}
              balances={balances}
              onSubmit={handleSubmit}
              onUploadDocument={handleUploadDocument}
              isPending={createRequest.isPending}
              isUploading={false}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance Card - show for all users */}
      <LeaveBalanceCard />

      {/* Loading state */}
      {isLoading && (
        <Card className="card-stat">
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading leave requests...
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && requests?.length === 0 && (
        <Card className="card-stat">
          <CardContent className="p-8 text-center text-muted-foreground">
            No leave requests yet. Click "Request Leave" to submit your first request.
          </CardContent>
        </Card>
      )}

      {!isLoading && (requests?.length || 0) > 0 && (
        <Tabs
          defaultValue={canViewTeamRequests && myRequests.length === 0 && teamRequests.length > 0 ? 'team' : 'my'}
          className="space-y-4"
        >
          <TabsList className={canViewTeamRequests ? 'grid w-full grid-cols-2 max-w-md' : 'grid w-full grid-cols-1 max-w-xs'}>
            <TabsTrigger value="my">
              My Leave
              <span className="ml-2 text-xs text-muted-foreground">({myRequests.length})</span>
            </TabsTrigger>
            {canViewTeamRequests && (
              <TabsTrigger value="team">
                Team Leave
                <span className="ml-2 text-xs text-muted-foreground">({teamRequests.length})</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my" className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">My Requests</h2>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
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
            </div>

            <Tabs value={myLeaveView} onValueChange={(value) => setMyLeaveView(value as 'current' | 'history')} className="space-y-3">
              <TabsList className="grid w-full grid-cols-2 max-w-sm">
                <TabsTrigger value="current">
                  Current
                  <span className="ml-2 text-xs text-muted-foreground">({myCurrentRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="history">
                  History
                  <span className="ml-2 text-xs text-muted-foreground">({myHistoryRequests.length})</span>
                </TabsTrigger>
              </TabsList>

              <MyLeaveRequestsTable
                requests={visibleMyRequests}
                emptyMessage={myLeaveView === 'history' ? 'No leave history yet.' : 'No active leave requests right now.'}
                getStatusDisplay={getStatusDisplay}
                getCancellationBadge={getCancellationBadge}
                canAmend={canAmend}
                canCancelPendingRequest={canCancelPendingRequest}
                canRequestCancellation={canRequestCancellation}
                onAmend={handleAmend}
                onCancel={handleCancellation}
              />
            </Tabs>
          </TabsContent>

          {canViewTeamRequests && (
            <TabsContent value="team" className="space-y-3">
              <h2 className="text-lg font-semibold">Team Requests</h2>
              <Tabs value={teamLeaveView} onValueChange={(value) => setTeamLeaveView(value as 'current' | 'history')} className="space-y-3">
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                  <TabsTrigger value="current">
                    Current
                    <span className="ml-2 text-xs text-muted-foreground">({teamCurrentRequests.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    History
                    <span className="ml-2 text-xs text-muted-foreground">({teamHistoryRequests.length})</span>
                  </TabsTrigger>
                </TabsList>

                <TeamLeaveRequestsTable
                  requests={visibleTeamRequests}
                  emptyMessage={teamLeaveView === 'history' ? 'No leave approval history yet.' : 'No active team leave requests available.'}
                  role={role}
                  getStatusDisplay={getStatusDisplay}
                  getCancellationBadge={getCancellationBadge}
                  shouldShowLeaveDetailsButton={shouldShowLeaveDetailsButton}
                  canApproveCancellation={canApproveCancellation}
                  canApprove={canApprove}
                  onOpenDetails={(request) => void handleOpenDetails(request)}
                  onCancellationReview={handleCancellationReview}
                  onAction={handleAction}
                />
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
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
    </div>
  );
}
