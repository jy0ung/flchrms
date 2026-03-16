import { useEffect, useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppRole, LeaveRequest } from '@/types/hrms';
import type { LeaveActionDialogAction } from '@/components/leave/LeaveActionDialog';
import { ContextChip, DataTableShell, RecordSurfaceHeader, SectionToolbar } from '@/components/system';
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

type ViewConfig = {
  label: string;
  shortLabel: string;
  title: string;
  summary: string;
  requests: LeaveRequest[];
};

type EmptyStateConfig = {
  title: string;
  description: string;
};

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
  onOpenDetails: (request: LeaveRequest, trigger?: HTMLElement | null) => void;
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
  const activeFilterLabel = STATUS_FILTER_OPTIONS.find((item) => item.value === statusFilter)?.label ?? 'All';

  useEffect(() => {
    const nextView = availableViews.includes(defaultView) ? defaultView : availableViews[0];
    setView((currentView) => (currentView === nextView ? currentView : nextView));
  }, [availableViews, defaultView]);

  const viewConfig = useMemo(() => {
    const config: Record<LeaveViewOption, ViewConfig> = {
      MY_CURRENT: {
        label: `My Current (${myCurrentRequests.length})`,
        shortLabel: 'My Current',
        title: 'My Active Requests',
        summary: 'Track active requests, amendments, documents, and approval progress from one list.',
        requests: myCurrentRequests,
      },
      MY_HISTORY: {
        label: `My History (${myHistoryRequests.length})`,
        shortLabel: 'My History',
        title: 'My Request History',
        summary: 'Resolved requests and completed leave entries kept for reference.',
        requests: myHistoryRequests,
      },
      TEAM_CURRENT: {
        label: `Team Current (${teamCurrentRequests.length})`,
        shortLabel: 'Team Current',
        title: 'Approval Inbox',
        summary: 'Requests currently waiting on your review, delegated action, or document follow-up.',
        requests: teamCurrentRequests,
      },
      TEAM_HISTORY: {
        label: `Team History (${teamHistoryRequests.length})`,
        shortLabel: 'Team History',
        title: 'Resolved Team Requests',
        summary: 'Completed team decisions retained for traceability, follow-up, and audit context.',
        requests: teamHistoryRequests,
      },
    };

    return config;
  }, [myCurrentRequests, myHistoryRequests, teamCurrentRequests, teamHistoryRequests]);

  const filteredRequests = useMemo(
    () => viewConfig[view].requests.filter((request) => matchesStatusFilter(request, statusFilter)),
    [view, viewConfig, statusFilter],
  );
  const activeView = viewConfig[view];

  const emptyState = useMemo<EmptyStateConfig>(() => {
    if (statusFilter !== 'ALL') {
      return {
        title: 'No requests for this status',
        description:
          view === 'TEAM_CURRENT' || view === 'TEAM_HISTORY'
            ? 'Try another status filter or clear it to review the full queue.'
            : 'Try another status filter or clear it to return to your full request list.',
      };
    }

    switch (view) {
      case 'MY_HISTORY':
        return {
          title: 'No leave history yet',
          description: 'Completed, cancelled, and rejected requests will appear here once you have prior leave activity.',
        };
      case 'MY_CURRENT':
        return {
          title: 'No active leave requests',
          description: 'Start a leave request when you need time away, or return here to track upcoming submissions.',
        };
      case 'TEAM_HISTORY':
        return {
          title: 'No resolved team decisions',
          description: 'Approved, rejected, and completed team requests will appear here for reference.',
        };
      case 'TEAM_CURRENT':
        return {
          title: 'Approval queue clear',
          description: 'There are no team requests waiting for review right now.',
        };
      default:
        return {
          title: 'No leave requests found',
          description: 'Try another view or filter to surface a different request set.',
        };
    }
  }, [statusFilter, view]);

  return (
    <Tabs value={view} onValueChange={(value) => setView(value as LeaveViewOption)} className="space-y-4">
      <section
        aria-label="Queue views"
        className="space-y-4 rounded-xl border border-border/70 bg-muted/[0.18] p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Queue views
            </p>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {canViewTeamRequests
                ? 'Choose which leave queue needs your attention'
                : 'Choose which leave requests you want to review'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Navigation switches between request lists. Filters below only change the list you are currently viewing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ContextChip className="rounded-full">
              Current view: {activeView.shortLabel}
            </ContextChip>
            {statusFilter !== 'ALL' ? (
              <ContextChip className="rounded-full">
                Filter: {activeFilterLabel}
              </ContextChip>
            ) : null}
          </div>
        </div>

        <TabsList className="grid h-auto w-full auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-1 overflow-x-auto rounded-xl bg-background p-1 md:w-auto md:min-w-[560px] md:grid-cols-4 md:grid-flow-row md:overflow-visible">
          {availableViews.map((option) => (
            <TabsTrigger key={option} value={option} className="whitespace-nowrap text-xs sm:text-sm">
              <span className="lg:hidden">{viewConfig[option].shortLabel}</span>
              <span className="hidden lg:inline">{viewConfig[option].label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </section>

      {availableViews.map((option) => {
        const currentView = viewConfig[option];

        return (
          <TabsContent key={option} value={option} className="mt-0 space-y-3">
            <RecordSurfaceHeader
              title={currentView.title}
              description={currentView.summary}
              meta={(
                <>
                  <ContextChip className="rounded-full">
                    {currentView.shortLabel}
                  </ContextChip>
                  <ContextChip className="rounded-full">
                    {filteredRequests.length} visible
                  </ContextChip>
                  <ContextChip className="gap-1 rounded-full">
                    <Filter className="h-3 w-3" />
                    {statusFilter === 'ALL' ? 'All statuses' : `Filtered: ${activeFilterLabel}`}
                  </ContextChip>
                </>
              )}
            />

            <DataTableShell
              toolbar={(
                <SectionToolbar
                  variant="inline"
                  density="compact"
                  ariaLabel="Leave request filters"
                  leadingSlot={(
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Queue controls
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Filter the current list without changing your queue view.
                      </p>
                    </div>
                  )}
                  filters={[
                    {
                      id: 'leave-status-filter',
                      label: 'Status',
                      control: (
                        <Select
                          value={statusFilter}
                          onValueChange={(next) => setStatusFilter(next as StatusFilterOption)}
                        >
                          <SelectTrigger aria-label="Filter leave requests by status" className="h-9 rounded-full">
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
                  actions={statusFilter !== 'ALL' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-full px-3 text-xs text-muted-foreground"
                      onClick={() => setStatusFilter('ALL')}
                    >
                      Clear filter
                    </Button>
                  ) : undefined}
                  trailingSlot={workflowInfoPopover}
                  collapseFiltersOnMobile={false}
                />
              )}
              content={
                option === 'MY_CURRENT' || option === 'MY_HISTORY' ? (
                  <MyLeaveRequestsTable
                    requests={filteredRequests}
                    emptyTitle={emptyState.title}
                    emptyMessage={emptyState.description}
                    getStatusDisplay={getStatusDisplay}
                    getCancellationBadge={getCancellationBadge}
                    shouldShowLeaveDetailsButton={shouldShowLeaveDetailsButton}
                    canAmend={canAmend}
                    canCancelPendingRequest={canCancelPendingRequest}
                    canRequestCancellation={canRequestCancellation}
                    onOpenDetails={onOpenDetails}
                    onAmend={onAmend}
                    onCancel={onCancel}
                  />
                ) : (
                  <TeamLeaveRequestsTable
                    requests={filteredRequests}
                    emptyTitle={emptyState.title}
                    emptyMessage={emptyState.description}
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
        );
      })}
    </Tabs>
  );
}
