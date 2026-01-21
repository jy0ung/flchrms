import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveRequests, useLeaveTypes, useCreateLeaveRequest, useApproveLeaveRequest, useCancelLeaveRequest } from '@/hooks/useLeaveRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Check, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function Leave() {
  const { role, user } = useAuth();
  const { data: requests, isLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const createRequest = useCreateLeaveRequest();
  const approveRequest = useApproveLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;

    createRequest.mutate({
      leave_type_id: formData.get('leaveType') as string,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      reason: formData.get('reason') as string,
    }, {
      onSuccess: () => setOpen(false),
    });
  };

  const statusColors: Record<string, string> = {
    pending: 'badge-warning',
    manager_approved: 'badge-info',
    hr_approved: 'badge-success',
    rejected: 'badge-destructive',
    cancelled: 'bg-muted text-muted-foreground',
  };

  const canApprove = (status: string) => {
    if (role === 'manager' && status === 'pending') return true;
    if ((role === 'hr' || role === 'admin') && (status === 'pending' || status === 'manager_approved')) return true;
    return false;
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
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select name="leaveType" required>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes?.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
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
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : requests?.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No leave requests</td></tr>
                ) : (
                  requests?.map(request => (
                    <tr key={request.id} className="border-t border-border table-row-hover">
                      <td className="p-4">
                        <p className="font-medium">{request.employee?.first_name} {request.employee?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{request.employee?.email}</p>
                      </td>
                      <td className="p-4">{request.leave_type?.name}</td>
                      <td className="p-4">
                        <p>{format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}</p>
                        <p className="text-sm text-muted-foreground">{request.days_count} days</p>
                      </td>
                      <td className="p-4">
                        <Badge className={statusColors[request.status]}>{request.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="p-4">
                        {canApprove(request.status) && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-success hover:bg-success/10"
                              onClick={() => approveRequest.mutate({ requestId: request.id, action: 'approve' })}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10"
                              onClick={() => approveRequest.mutate({ requestId: request.id, action: 'reject' })}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {request.status === 'pending' && request.employee_id === user?.id && (
                          <Button size="sm" variant="ghost" onClick={() => cancelRequest.mutate(request.id)}>
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
