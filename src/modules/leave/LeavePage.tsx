import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Clock3, History, Info, Plus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DataTableShell, QueryErrorState } from '@/components/system';
import { WorkspaceMetricStrip } from '@/components/workspace/WorkspaceMetricStrip';
import { LeaveBalanceSection } from '@/components/leave/LeaveBalanceSection';
import { LeaveRequestWorkspace } from '@/components/leave/LeaveRequestWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { isEmployee } from '@/lib/permissions';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { LeaveDetailDrawer } from '@/modules/leave/components/LeaveDrawer/LeaveDetailDrawer';
import { LeaveManagementDialogs } from '@/modules/leave/components/LeaveManagementDialogs';
import { useLeaveCapabilities } from '@/modules/leave/hooks/useLeaveCapabilities';
import { useLeaveDrawerState } from '@/modules/leave/hooks/useLeaveDrawerState';
import { useLeaveWorkflowController } from '@/modules/leave/hooks/useLeaveWorkflowController';
import type { LeavePageProps, LeaveWorkspaceView } from '@/modules/leave/types';

function coerceWorkspaceView(value: string | null): LeaveWorkspaceView | null {
  switch (value) {
    case 'MY_CURRENT':
    case 'MY_HISTORY':
    case 'TEAM_CURRENT':
    case 'TEAM_HISTORY':
      return value;
    default:
      return null;
  }
}

export function LeavePage({ initialView }: LeavePageProps) {
  usePageTitle('Leave');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, user } = useAuth();
  const { data: requests, isLoading, isError, refetch } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: balances } = useLeaveBalance();
  const {
    pageActions,
    defaultWorkspaceView,
    getStatusDisplay,
    getCancellationBadge,
    getRowPermissions,
    isHistoricalRequest,
    canViewRequestAtCurrentApprovalStage,
  } = useLeaveCapabilities();

  const controller = useLeaveWorkflowController({ getRowPermissions });
  const commandIntent = searchParams.get('command');
  const requestedWorkspaceView = coerceWorkspaceView(searchParams.get('workspaceView'));

  const myRequests = useMemo(
    () => requests?.filter((request) => request.employee_id === user?.id) || [],
    [requests, user?.id],
  );

  const teamRequests = useMemo(
    () => requests?.filter((request) => request.employee_id !== user?.id && canViewRequestAtCurrentApprovalStage(request)) || [],
    [canViewRequestAtCurrentApprovalStage, requests, user?.id],
  );

  const myCurrentRequests = useMemo(
    () => myRequests.filter((request) => !isHistoricalRequest(request)),
    [isHistoricalRequest, myRequests],
  );

  const myHistoryRequests = useMemo(
    () => myRequests.filter((request) => isHistoricalRequest(request)),
    [isHistoricalRequest, myRequests],
  );

  const teamCurrentRequests = useMemo(
    () => teamRequests.filter((request) => !isHistoricalRequest(request)),
    [isHistoricalRequest, teamRequests],
  );

  const teamHistoryRequests = useMemo(
    () => teamRequests.filter((request) => isHistoricalRequest(request)),
    [isHistoricalRequest, teamRequests],
  );

  const visibleRequests = useMemo(
    () => [...myRequests, ...teamRequests],
    [myRequests, teamRequests],
  );

  const drawer = useLeaveDrawerState({
    requests: visibleRequests,
    loading: isLoading,
  });

  const selectedStatusDisplay = drawer.selectedRequest ? getStatusDisplay(drawer.selectedRequest) : null;
  const selectedCancellationBadge = drawer.selectedRequest ? getCancellationBadge(drawer.selectedRequest) : null;
  const selectedPermissions = drawer.selectedRequest ? getRowPermissions(drawer.selectedRequest) : null;

  const effectiveWorkspaceView =
    requestedWorkspaceView ?? initialView ?? defaultWorkspaceView({
      myRequestCount: myRequests.length,
      teamRequestCount: teamRequests.length,
    });

  useEffect(() => {
    if (commandIntent !== 'request') {
      return;
    }

    if (pageActions.canCreateRequest) {
      controller.openRequestWizard();
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete('command');
      return nextParams;
    }, { replace: true });
  }, [commandIntent, controller, pageActions.canCreateRequest, setSearchParams]);

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
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,26rem)]" align="start">
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

  const metricItems = useMemo(() => {
    const items = [
      {
        id: 'my-active-requests',
        label: 'Active requests',
        value: myCurrentRequests.length,
        description: 'Personal requests still in progress or awaiting completion.',
        icon: Clock3,
        tone: 'warning' as const,
      },
      {
        id: 'my-request-history',
        label: 'Request history',
        value: myHistoryRequests.length,
        description: 'Resolved or completed requests in your timeline.',
        icon: History,
        tone: 'default' as const,
      },
    ];

    if (pageActions.canViewTeamRequests) {
      items.push(
        {
          id: 'team-current-requests',
          label: 'Team inbox',
          value: teamCurrentRequests.length,
          description: 'Current team requests visible to you in this workspace.',
          icon: Users,
          tone: 'info' as const,
        },
        {
          id: 'team-history-requests',
          label: 'Team history',
          value: teamHistoryRequests.length,
          description: 'Resolved team requests retained for workflow traceability.',
          icon: History,
          tone: 'default' as const,
        },
      );
    } else {
      items.push(
        {
          id: 'balance-buckets',
          label: 'Balance buckets',
          value: balances?.length ?? 0,
          description: 'Leave types currently tracking an accrued balance.',
          icon: CalendarDays,
          tone: 'success' as const,
        },
        {
          id: 'leave-types',
          label: 'Leave types',
          value: leaveTypes?.length ?? 0,
          description: 'Request categories currently available in the workspace.',
          icon: CalendarDays,
          tone: 'info' as const,
        },
      );
    }

    return items;
  }, [
    balances?.length,
    leaveTypes?.length,
    myCurrentRequests.length,
    myHistoryRequests.length,
    pageActions.canViewTeamRequests,
    teamCurrentRequests.length,
    teamHistoryRequests.length,
  ]);

  return (
    <ModuleLayout maxWidth="7xl">
      <ModuleLayout.Header
        eyebrow="Module Workspace"
        title="Leave Management"
        description={isEmployee(role) ? 'Your leave requests, balances, and history in one workspace.' : 'Manage leave requests and approvals in context.'}
        actions={pageActions.canCreateRequest ? [
          {
            id: 'request-leave',
            label: 'Request Leave',
            icon: Plus,
            onClick: controller.openRequestWizard,
            variant: 'default',
          },
        ] : undefined}
      />

      <ModuleLayout.Toolbar
        density="compact"
        ariaLabel="Leave workspace controls"
        leadingSlot={workflowInfoPopover}
        trailingSlot={pageActions.canOpenTeamCalendarLink ? (
          <Button variant="outline" className="h-9 rounded-full" onClick={() => navigate('/calendar')}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Open Team Calendar
          </Button>
        ) : null}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{myCurrentRequests.length} active personal request{myCurrentRequests.length === 1 ? '' : 's'}</span>
          {pageActions.canViewTeamRequests ? (
            <>
              <span aria-hidden="true">.</span>
              <span>{teamCurrentRequests.length} team request{teamCurrentRequests.length === 1 ? '' : 's'} awaiting visibility</span>
            </>
          ) : null}
        </div>
      </ModuleLayout.Toolbar>

      {isError ? (
        <QueryErrorState label="leave requests" onRetry={() => refetch()} />
      ) : null}

      <ModuleLayout.Content>
        <WorkspaceMetricStrip items={metricItems} />

        <LeaveBalanceSection balances={balances ?? []} />

        {isLoading ? (
          <DataTableShell
            title="Leave Requests"
            loading
            loadingSkeleton={(
              <div className="p-4 text-center text-muted-foreground">
                Loading leave requests...
              </div>
            )}
          />
        ) : (
          <LeaveRequestWorkspace
            role={role}
            canViewTeamRequests={pageActions.canViewTeamRequests}
            myCurrentRequests={myCurrentRequests}
            myHistoryRequests={myHistoryRequests}
            teamCurrentRequests={teamCurrentRequests}
            teamHistoryRequests={teamHistoryRequests}
            defaultView={effectiveWorkspaceView}
            getStatusDisplay={getStatusDisplay}
            getCancellationBadge={getCancellationBadge}
            canAmend={(request) => getRowPermissions(request).canAmend}
            canCancelPendingRequest={(request) => getRowPermissions(request).canCancelPending}
            canRequestCancellation={(request) => getRowPermissions(request).canRequestCancellation}
            canApproveCancellation={(request) => getRowPermissions(request).canApproveCancellation}
            canApprove={(request) => getRowPermissions(request).canApprove}
            shouldShowLeaveDetailsButton={(request) => getRowPermissions(request).canOpenDrawer}
            onAmend={controller.openAmendDialog}
            onCancel={controller.openCancellationDialog}
            onOpenDetails={(request) => drawer.openRequest(request.id)}
            onCancellationReview={controller.openCancellationReviewDialog}
            onAction={controller.openActionDialog}
            workflowInfoPopover={workflowInfoPopover}
          />
        )}
      </ModuleLayout.Content>

      <LeaveDetailDrawer
        open={drawer.isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) drawer.closeDrawer();
        }}
        request={drawer.selectedRequest}
        loading={isLoading}
        isUnavailable={drawer.isUnavailable}
        tab={drawer.drawerState.tab}
        onTabChange={drawer.setTab}
        statusDisplay={selectedStatusDisplay}
        cancellationBadge={selectedCancellationBadge}
        rowPermissions={selectedPermissions}
        onApprove={(request) => controller.openActionDialog(request, 'approve')}
        onReject={(request) => controller.openActionDialog(request, 'reject')}
        onRequestDocument={(request) => controller.openActionDialog(request, 'request_document')}
        onAmend={controller.openAmendDialog}
        onCancel={controller.openCancellationDialog}
        onApproveCancellation={(request) => controller.openCancellationReviewDialog(request, 'approve')}
        onRejectCancellation={(request) => controller.openCancellationReviewDialog(request, 'reject')}
      />

      <LeaveManagementDialogs
        controller={controller}
        leaveTypes={leaveTypes}
        balances={balances}
      />
    </ModuleLayout>
  );
}
