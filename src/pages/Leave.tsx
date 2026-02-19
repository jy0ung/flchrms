import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useCancelLeaveRequest, useAmendLeaveRequest, useUploadLeaveDocument } from '@/hooks/useLeaveRequests';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Check, X, FileText, Upload, MessageSquare, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
 import { Info } from 'lucide-react';
import { format } from 'date-fns';
import { LeaveRequest, LeaveStatus } from '@/types/hrms';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import { supabase } from '@/integrations/supabase/client';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function Leave() {
  const { role, user } = useAuth();
  const { data: requests, isLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: balances, refetch: refetchBalances } = useLeaveBalance();
  const createRequest = useCreateLeaveRequest();
  const approveRequest = useApproveLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();
  const amendRequest = useAmendLeaveRequest();
  const uploadDocument = useUploadLeaveDocument();
  
  const [open, setOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_document'>('approve');
  const [managerComments, setManagerComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [amendmentNotes, setAmendmentNotes] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

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

  const handleAction = (request: LeaveRequest, action: 'approve' | 'reject' | 'request_document') => {
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
    gm_approved: { color: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Awaiting HR' },
    director_approved: { color: 'bg-amber-500/20 text-amber-600 border-amber-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Awaiting HR' },
    hr_approved: { color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approved' },
    rejected: { color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
    cancelled: { color: 'bg-muted text-muted-foreground', icon: <X className="w-3 h-3" />, label: 'Cancelled' },
  };

  const canApprove = (request: LeaveRequest) => {
    // Multi-level approval workflow:
    // Employee -> Manager -> GM -> HR
    // Manager -> GM -> HR
    // GM -> Director -> HR
    
    // Manager can approve pending requests
    if (role === 'manager' && request.status === 'pending') return true;
    
    // GM can approve manager_approved requests (or pending if the employee is a manager)
    if (role === 'general_manager' && (request.status === 'manager_approved' || request.status === 'pending')) return true;
    
    // Director can approve gm_approved requests (when GM submits their own leave)
    if (role === 'director' && request.status === 'gm_approved') return true;
    
    // HR/Admin can approve gm_approved or director_approved requests (final approval)
    // HR can also view and approve at any stage for visibility
    if ((role === 'hr' || role === 'admin') && 
        (request.status === 'pending' || request.status === 'manager_approved' || 
         request.status === 'gm_approved' || request.status === 'director_approved')) return true;
    
    return false;
  };

  const canAmend = (request: LeaveRequest) => {
    return request.employee_id === user?.id && (request.status === 'rejected' || (request.status === 'pending' && request.document_required));
  };

  // Filter own requests vs team requests for display
  const myRequests = useMemo(() => 
    requests?.filter(r => r.employee_id === user?.id) || [],
    [requests, user?.id]
  );

  const teamRequests = useMemo(() => 
    requests?.filter(r => r.employee_id !== user?.id) || [],
    [requests, user?.id]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-accent" />
            Leave Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === 'employee' ? 'Your leave requests and balance' : 'Manage leave requests'}
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

      {/* My Requests Section */}
      {myRequests.length > 0 && (
        <div className="space-y-3">
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
                   <h4 className="font-semibold text-sm">Approval Workflow</h4>
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
                         <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">HR</Badge>
                       </div>
                     </div>
                     <div className="space-y-1">
                       <span className="font-medium text-foreground">Manager:</span>
                       <div className="flex items-center gap-1 flex-wrap">
                         <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">Submit</Badge>
                         <span>→</span>
                         <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600">GM</Badge>
                         <span>→</span>
                         <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">HR</Badge>
                       </div>
                     </div>
                     <div className="space-y-1">
                       <span className="font-medium text-foreground">GM:</span>
                       <div className="flex items-center gap-1 flex-wrap">
                         <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600">Submit</Badge>
                         <span>→</span>
                         <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">Director</Badge>
                         <span>→</span>
                         <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">HR</Badge>
                       </div>
                     </div>
                   </div>
                 </div>
               </PopoverContent>
             </Popover>
           </div>
          <Card className="card-stat">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
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
                    {myRequests.map(request => {
                      const status = statusConfig[request.status];
                      return (
                        <tr key={request.id} className="border-t border-border table-row-hover">
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
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {request.document_url && (
                                <DocumentViewButton documentPath={request.document_url} />
                              )}
                              {canAmend(request) && (
                                <Button size="sm" variant="outline" onClick={() => handleAmend(request)}>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Amend
                                </Button>
                              )}
                              {request.status === 'pending' && !request.document_required && (
                                <Button size="sm" variant="ghost" onClick={() => cancelRequest.mutate(request.id)}>
                                  Cancel
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Requests Section - for managers/gm/director/hr/admin */}
      {(role === 'manager' || role === 'general_manager' || role === 'director' || role === 'hr' || role === 'admin') && teamRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Team Requests</h2>
          <Card className="card-stat">
            <CardContent className="p-0">
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
                    {teamRequests.map(request => {
                      const status = statusConfig[request.status];
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
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {canApprove(request) && (
                                <>
                                  <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-500/10"
                                    onClick={() => handleAction(request, 'approve')}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-500/10"
                                    onClick={() => handleAction(request, 'reject')}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                  {role === 'manager' && (
                                    <Button size="sm" variant="outline" className="text-orange-600 hover:bg-orange-500/10"
                                      onClick={() => handleAction(request, 'request_document')}>
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                              {request.document_url && (
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && requests?.length === 0 && (
        <Card className="card-stat">
          <CardContent className="p-8 text-center text-muted-foreground">
            No leave requests yet. Click "Request Leave" to submit your first request.
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card className="card-stat">
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading leave requests...
          </CardContent>
        </Card>
      )}

      {/* Action Dialog (Approve/Reject/Request Document) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Leave Request'}
              {actionType === 'reject' && 'Reject Leave Request'}
              {actionType === 'request_document' && 'Request Supporting Document'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.employee?.first_name} {selectedRequest?.employee?.last_name} - {selectedRequest?.leave_type?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {actionType === 'reject' && (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{actionType === 'request_document' ? 'Document Request Message' : 'Comments (Optional)'}</Label>
              <Textarea 
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                placeholder={actionType === 'request_document' ? 'Specify what documents are needed...' : 'Add any comments...'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={submitAction}
              disabled={approveRequest.isPending}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {actionType === 'approve' && 'Approve'}
              {actionType === 'reject' && 'Reject'}
              {actionType === 'request_document' && 'Request Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amendment Dialog */}
      <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Amend Leave Request</DialogTitle>
            <DialogDescription>
              Update your request and attach any required documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest?.rejection_reason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rejection reason:</strong> {selectedRequest.rejection_reason}
                </AlertDescription>
              </Alert>
            )}
            {selectedRequest?.manager_comments && (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  <strong>Manager's note:</strong> {selectedRequest.manager_comments}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Amendment Notes</Label>
              <Textarea 
                value={amendmentNotes}
                onChange={(e) => setAmendmentNotes(e.target.value)}
                placeholder="Explain the changes or provide additional information..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Supporting Document</Label>
              <Input 
                type="file"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <p className="text-xs text-muted-foreground">Accepted formats: PDF, JPG, PNG, DOC, DOCX</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAmendDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={submitAmendment}
              disabled={amendRequest.isPending || uploadDocument.isPending || !amendmentNotes}
            >
              Submit Amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
