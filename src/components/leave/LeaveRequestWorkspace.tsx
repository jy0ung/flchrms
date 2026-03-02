import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { AppRole, LeaveRequest } from '@/types/hrms';
import type { LeaveActionDialogAction } from '@/components/leave/LeaveActionDialog';
import { DataTableShell, SectionToolbar } from '@/components/system';
import { MyLeaveRequestsTable } from '@/components/leave/MyLeaveRequestsTable';
import { TeamLeaveRequestsTable } from '@/components/leave/TeamLeaveRequestsTable';
import { isCancellationPending } from '@/lib/leave-utils';

export type LeaveViewOption =
  | 'MY_CURRENT'
  | 'MY_HISTORY'
  | 'TEAM_CURRENT'
  | 'TEAM_HISTORY';

type StatusFilterOption = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

type LeaveStatusDisplay = {
  status: string;
  label: string;
};

type LeaveCancellationBadge = {
  status: string;
  label: string;
} | null;

interface LeaveRequestWorkspaceProps {
  role: AppRole | null;
  canViewTeamRequests: boolean;
  myCurrentRequests: LeaveRequest[];
  myHistoryRequests: LeaveRequest[];
  teamCurrentRequests: LeaveRequest[];
  teamHistoryRequests: LeaveRequest[];
  defaultView?: LeaveViewOption;
  getStatusDisplay: (request: LeaveRequest) => LeaveStatusDisplay;
  getCancellationBadge: (request: LeaveRequest) => LeaveCancellationBadge;
  canAmend: (request: LeaveRequest) => boolean;
  canCancelPendingRequest: (request: LeaveRequest) => boolean;
  canRequestCancellation: (request: LeaveRequest) => boolean;
  canApproveCancellation: (request: LeaveRequest) => boolean;
  canApprove: (request: LeaveRequest) => boolean;
  shouldShowLeaveDetailsButton: (request: LeaveRequest) => boolean;
  onAmend: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
  onOpenDetails: (request: LeaveRequest) => void;
  onCancellationReview: (request: LeaveRequest, action: 'approve' | 'reject') => void;
  onAction: (request: LeaveRequest, action: LeaveActionDialogAction) => void;
  workflowInfoPopover: React.ReactNode;
}

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilterOption; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function matchesStatusFilter(request: LeaveRequest, filter: StatusFilterOption) {
  switch (filter) {
    case 'ALL':
      return true;
    case 'PENDING':
      if (isCancellationPending(request)) return true;
      if (request.status === 'rejected' || request.status === 'cancelled') return false;
      return !request.final_approved_at;
    case 'APPROVED':
      if (request.status === 'rejected' || request.status === 'cancelled') return false;
      if (isCancellationPending(request)) return false;
      return Boolean(request.final_approved_at);
    case 'REJECTED':
      return request.status === 'rejected' || request.cancellation_status === 'rejected';
    case 'CANCELLED':
      return request.status === 'cancelled' || request.cancellation_status === 'approved';
    default:
      return true;
  }
}

export function LeaveRequestWorkspace({
  role,
  canViewTeamRequests,
  myCurrentRequests,
  myHistoryRequests,
  teamCurrentRequests,
  teamHistoryRequests,
  defaultView = 'MY_CURRENT',
  getStatusDisplay,
  getCancellationBadge,
  canAmend,
  canCancelPendingRequest,
  canRequestCancellation,
  canApproveCancellation,
  canApprove,
  shouldShowLeaveDetailsButton,
  onAmend,
  onCancel,
  onOpenDetails,
  onCancellationReview,
  onAction,
  workflowInfoPopover,
}: LeaveRequestWorkspaceProps) {
  const availableViews = useMemo(() => {
    const views: LeaveViewOption[] = ['MY_CURRENT', 'MY_HISTORY'];
    if (canViewTeamRequests) {
      views.push('TEAM_CURRENT', 'TEAM_HISTORY');
    }
    return views;
  }, [canViewTeamRequests]);

  const [view, setView] = useState<LeaveViewOption>(
    availableViews.includes(defaultView) ? defaultView : availableViews[0],
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('ALL');

  const viewConfig = useMemo(() => {
    const config: Record<LeaveViewOption, { label: string; title: string; requests: LeaveRequest[] }> = {
      MY_CURRENT: {
        label: `My Current (${myCurrentRequests.length})`,
        title: 'My Current Requests',
        requests: myCurrentRequests,
      },
      MY_HISTORY: {
        label: `My History (${myHistoryRequests.length})`,
        title: 'My Request History',
        requests: myHistoryRequests,
      },
      TEAM_CURRENT: {
        label: `Team Current (${teamCurrentRequests.length})`,
        title: 'Team Current Requests',
        requests: teamCurrentRequests,
      },
      TEAM_HISTORY: {
        label: `Team History (${teamHistoryRequests.length})`,
        title: 'Team Request History',
        requests: teamHistoryRequests,
      },
    };

    return config;
  }, [myCurrentRequests, myHistoryRequests, teamCurrentRequests, teamHistoryRequests]);

  const filteredRequests = useMemo(
    () => viewConfig[view].requests.filter((request) => matchesStatusFilter(request, statusFilter)),
    [view, viewConfig, statusFilter],
  );

  const emptyMessage = useMemo(() => {
    if (statusFilter !== 'ALL') {
      return 'No requests match the selected status filter.';
    }

    switch (view) {
      case 'MY_HISTORY':
        return 'No leave history yet.';
      case 'MY_CURRENT':
        return 'No active leave requests right now.';
      case 'TEAM_HISTORY':
        return 'No leave approval history yet.';
      case 'TEAM_CURRENT':
        return 'No active team leave requests available.';
      default:
        return 'No leave requests found.';
    }
  }, [statusFilter, view]);

  return (
    <Tabs value={view} onValueChange={(value) => setView(value as LeaveViewOption)} className="space-y-4">
      <TabsList className="grid h-auto w-full gap-1 rounded-lg p-1 md:w-auto md:min-w-[560px] md:grid-cols-4">
        {availableViews.map((option) => (
          <TabsTrigger key={option} value={option} className="text-xs sm:text-sm">
            {viewConfig[option].label}
          </TabsTrigger>
        ))}
      </TabsList>

      {availableViews.map((option) => (
        <TabsContent key={option} value={option} className="space-y-3">
          <DataTableShell
            title={viewConfig[option].title}
            description={`Status filter: ${STATUS_FILTER_OPTIONS.find((item) => item.value === statusFilter)?.label ?? 'All'}`}
            headerActions={(
              <SectionToolbar
                variant="inline"
                density="compact"
                ariaLabel="Leave request filters"
                filters={[
                  {
                    id: 'leave-status-filter',
                    label: 'Status',
                    control: (
                      <Select
                        value={statusFilter}
                        onValueChange={(next) => setStatusFilter(next as StatusFilterOption)}
                      >
                        <SelectTrigger className="h-9 rounded-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_FILTER_OPTIONS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                    minWidthClassName: 'sm:min-w-[180px]',
                  },
                ]}
                trailingSlot={workflowInfoPopover}
              />
            )}
            content={
              option === 'MY_CURRENT' || option === 'MY_HISTORY' ? (
                <MyLeaveRequestsTable
                  requests={filteredRequests}
                  emptyMessage={emptyMessage}
                  getStatusDisplay={getStatusDisplay}
                  getCancellationBadge={getCancellationBadge}
                  canAmend={canAmend}
                  canCancelPendingRequest={canCancelPendingRequest}
                  canRequestCancellation={canRequestCancellation}
                  onAmend={onAmend}
                  onCancel={onCancel}
                />
              ) : (
                <TeamLeaveRequestsTable
                  requests={filteredRequests}
                  emptyMessage={emptyMessage}
                  role={role}
                  getStatusDisplay={getStatusDisplay}
                  getCancellationBadge={getCancellationBadge}
                  shouldShowLeaveDetailsButton={shouldShowLeaveDetailsButton}
                  canApproveCancellation={canApproveCancellation}
                  canApprove={canApprove}
                  onOpenDetails={onOpenDetails}
                  onCancellationReview={onCancellationReview}
                  onAction={onAction}
                />
              )
            }
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
