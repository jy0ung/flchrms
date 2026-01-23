import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useCancelLeaveRequest, useAmendLeaveRequest, useUploadLeaveDocument } from '@/hooks/useLeaveRequests';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Check, X, FileText, Upload, MessageSquare, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { LeaveRequest, LeaveStatus } from '@/types/hrms';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Leave() {
  const { role, user } = useAuth();
  const { data: requests, isLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
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
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    
    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const leaveTypeId = formData.get('leaveType') as string;
    const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;

    // Validate minimum days
    const selectedType = leaveTypes?.find(t => t.id === leaveTypeId);
    if (selectedType && days < selectedType.min_days) {
      setValidationError(`${selectedType.name} requires a minimum of ${selectedType.min_days} days.`);
      return;
    }

    createRequest.mutate({
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      reason: formData.get('reason') as string,
    }, {
      onSuccess: () => setOpen(false),
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
      onSuccess: () => setActionDialogOpen(false),
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
    manager_approved: { color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Awaiting HR' },
    hr_approved: { color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approved' },
    rejected: { color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
    cancelled: { color: 'bg-muted text-muted-foreground', icon: <X className="w-3 h-3" />, label: 'Cancelled' },
  };

  const canApprove = (request: LeaveRequest) => {
    if (role === 'manager' && request.status === 'pending') return true;
    if ((role === 'hr' || role === 'admin') && (request.status === 'pending' || request.status === 'manager_approved')) return true;
    return false;
  };

  const canAmend = (request: LeaveRequest) => {
    return request.employee_id === user?.id && (request.status === 'rejected' || (request.status === 'pending' && request.document_required));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-accent" />
            Leave Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === 'employee' ? 'Your leave requests' : 'Manage leave requests'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Request Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
              <DialogDescription>Submit a new leave request for approval</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select name="leaveType" required>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes?.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} 
                        {type.min_days > 1 && <span className="text-muted-foreground ml-1">(min {type.min_days} days)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" name="startDate" required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" name="endDate" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea name="reason" placeholder="Optional reason..." />
              </div>
              <Button type="submit" className="w-full" disabled={createRequest.isPending}>
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflow Legend */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium">Workflow:</span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">1. Employee Submits</Badge>
              <span>→</span>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600">2. Manager Reviews</Badge>
              <span>→</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-600">3. HR Approves</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

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
                {isLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : requests?.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No leave requests</td></tr>
                ) : (
                  requests?.map(request => {
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
                            {canAmend(request) && (
                              <Button size="sm" variant="outline" onClick={() => handleAmend(request)}>
                                <Upload className="w-4 h-4 mr-1" />
                                Amend
                              </Button>
                            )}
                            {request.status === 'pending' && request.employee_id === user?.id && !request.document_required && (
                              <Button size="sm" variant="ghost" onClick={() => cancelRequest.mutate(request.id)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
