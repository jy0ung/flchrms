import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/system';
import type { LeaveRequest } from '@/types/hrms';
import { getLeaveRequestEmployeeEmail, getLeaveRequestEmployeeName } from '@/lib/leave-request-display';

import type {
  LeaveCancellationBadge,
  LeaveRequestStatusDisplay,
} from '@/modules/leave/types';

interface RequestInfoTabProps {
  request: LeaveRequest;
  statusDisplay: LeaveRequestStatusDisplay;
  cancellationBadge: LeaveCancellationBadge;
  formatDateTime: (value: string | null | undefined) => string;
}

function formatWorkflowStageLabel(stage: string) {
  if (stage === 'general_manager') return 'General Manager';
  if (stage === 'manager') return 'Manager';
  if (stage === 'director') return 'Director';
  return stage;
}

export function RequestInfoTab({
  request,
  statusDisplay,
  cancellationBadge,
  formatDateTime,
}: RequestInfoTabProps) {
  const employeeName = getLeaveRequestEmployeeName(request);
  const employeeEmail = getLeaveRequestEmployeeEmail(request);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Request Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Employee:</span> {employeeName}</p>
            <p><span className="text-muted-foreground">Email:</span> {employeeEmail}</p>
            <p><span className="text-muted-foreground">Leave Type:</span> {request.leave_type?.name || '—'}</p>
            <p><span className="text-muted-foreground">Dates:</span> {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}</p>
            <p><span className="text-muted-foreground">Requested:</span> {request.days_count} day(s)</p>
            <p><span className="text-muted-foreground">Created:</span> {formatDateTime(request.created_at)}</p>
            <p><span className="text-muted-foreground">Updated:</span> {formatDateTime(request.updated_at)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status & Routing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={statusDisplay.status} labelOverride={statusDisplay.label} />
              {cancellationBadge ? (
                <StatusBadge
                  status={cancellationBadge.status}
                  labelOverride={cancellationBadge.label}
                  showIcon
                />
              ) : null}
              {request.leave_type?.requires_document ? (
                <Badge variant="outline">Doc Required</Badge>
              ) : null}
            </div>
            <p>
              <span className="text-muted-foreground">Approval Route:</span>{' '}
              {(request.approval_route_snapshot || []).map(formatWorkflowStageLabel).join(' -> ') || '—'}
            </p>
            {request.cancellation_route_snapshot?.length ? (
              <p>
                <span className="text-muted-foreground">Cancellation Route:</span>{' '}
                {request.cancellation_route_snapshot.map(formatWorkflowStageLabel).join(' -> ')}
              </p>
            ) : null}
            {request.reason ? (
              <p><span className="text-muted-foreground">Reason:</span> {request.reason}</p>
            ) : null}
            {request.manager_comments ? (
              <p><span className="text-muted-foreground">Approver Comments:</span> {request.manager_comments}</p>
            ) : null}
            {request.amendment_notes ? (
              <p><span className="text-muted-foreground">Amendment Notes:</span> {request.amendment_notes}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
