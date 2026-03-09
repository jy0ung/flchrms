import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, Info, Plus, WalletCards } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTableShell, QueryErrorState } from '@/components/system';
import { SummaryRail } from '@/components/workspace/SummaryRail';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { LeaveBalanceSection } from '@/components/leave/LeaveBalanceSection';
import { LeaveRequestWorkspace } from '@/components/leave/LeaveRequestWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDrawerFocusReturn } from '@/hooks/useDrawerFocusReturn';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { isEmployee } from '@/lib/permissions';
import { isCancellationPending } from '@/lib/leave-utils';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { LeaveDetailDrawer, LeaveManagementDialogs } from './components';
import { useLeaveCapabilities, useLeaveDrawerState, useLeaveWorkflowController } from './hooks';
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
  const { rememberTrigger, restoreFocusElement } = useDrawerFocusReturn();
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
  const canViewTeamRequests = pageActions.canViewTeamRequests;

  const effectiveWorkspaceView =
    requestedWorkspaceView ??
    initialView ??
    (canViewTeamRequests
      ? 'TEAM_CURRENT'
      : defaultWorkspaceView({
          myRequestCount: myRequests.length,
          teamRequestCount: teamRequests.length,
        }));

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
          className="h-8 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Approval workflow guide"
        >
          <Info className="h-4 w-4" />
          Approval guide
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,26rem)]" align="start">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Approval Workflow</h4>
          <p className="text-[11px] text-muted-foreground">
            Typical routing examples. Actual approval order follows the workflow profile configured for the requester.
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
    if (canViewTeamRequests) {
      const cancellationReviews = teamCurrentRequests.filter((request) =>
        isCancellationPending(request),
      ).length;

      return [
        {
          id: 'team-inbox',
          label: 'Approval inbox',
          value: teamCurrentRequests.length,
          helper: 'Requests that currently need your review or delegated action.',
        },
        {
          id: 'cancellation-reviews',
          label: 'Cancellation reviews',
          value: cancellationReviews,
          helper: 'Requests waiting on a cancellation decision.',
        },
      ];
    }

    const pendingDecisions = myCurrentRequests.filter((request) => !request.final_approved_at).length;

    return [
      {
        id: 'my-active-requests',
        label: 'Active requests',
        value: myCurrentRequests.length,
        helper: 'Personal requests still in progress or awaiting completion.',
      },
      {
        id: 'awaiting-decision',
        label: 'Awaiting decision',
        value: pendingDecisions,
        helper: 'Requests still moving through the approval route.',
      },
      {
        id: 'balance-buckets',
        label: 'Balance buckets',
        value: balances?.length ?? 0,
        helper: 'Leave types currently tracking an accrued balance.',
      },
      {
        id: 'request-history',
        label: 'Request history',
        value: myHistoryRequests.length,
        helper: 'Resolved or completed requests kept for reference.',
      },
    ];
  }, [
    balances?.length,
    canViewTeamRequests,
    myCurrentRequests,
    myHistoryRequests.length,
    teamCurrentRequests,
  ]);

  const workflowContextTitle = canViewTeamRequests ? 'Approval inbox' : 'My request workspace';
  const workflowContextDescription = canViewTeamRequests
    ? 'Review queue items first. Personal balances stay nearby as a secondary reference.'
    : 'Track your requests, balances, and supporting documents from one personal workspace.';

  const personalReferencePanel = (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <WalletCards className="h-4 w-4 text-muted-foreground" />
          Personal balance reference
        </div>
        <CardTitle className="text-base">My leave balances</CardTitle>
        <CardDescription>
          Keep your own entitlement nearby while you review or track requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {balances?.length ? (
          <LeaveBalanceSection
            balances={balances}
            maxPrimaryCards={canViewTeamRequests ? 2 : 4}
            defaultCollapsedSecondary={canViewTeamRequests}
          />
        ) : (
          <WorkspaceStatePanel
            title="No balances available"
            description="Leave balance buckets will appear here once they are available for your account."
            icon={WalletCards}
            appearance="subtle"
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <ModuleLayout maxWidth="7xl">
      <ModuleLayout.Header
        eyebrow="Module Workspace"
        title="Leave Management"
        description={
          canViewTeamRequests
            ? 'Review team requests and work approval queues in context.'
            : isEmployee(role)
              ? 'Your leave requests, balances, and history in one workspace.'
              : 'Manage leave requests and approvals in context.'
        }
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
        trailingSlot={pageActions.canOpenTeamCalendarLink ? (
          <Button variant="outline" className="h-9 rounded-full" onClick={() => navigate('/calendar')}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Open Team Calendar
          </Button>
        ) : null}
      />

      {isError ? (
        <QueryErrorState label="leave requests" onRetry={() => refetch()} />
      ) : null}

      <ModuleLayout.Content>
        <SummaryRail items={metricItems} />

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
          <div className={canViewTeamRequests ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]' : 'space-y-6'}>
            <div className="space-y-6">
              {!canViewTeamRequests ? personalReferencePanel : null}

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-1 pb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    {workflowContextTitle}
                  </div>
                  <CardTitle className="text-base">
                    {canViewTeamRequests ? 'Leave approval queue' : 'Leave request tracker'}
                  </CardTitle>
                  <CardDescription>{workflowContextDescription}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
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
                    onOpenDetails={(request, trigger) => {
                      rememberTrigger(trigger);
                      drawer.openRequest(request.id);
                    }}
                    onCancellationReview={controller.openCancellationReviewDialog}
                    onAction={controller.openActionDialog}
                    workflowInfoPopover={workflowInfoPopover}
                  />
                </CardContent>
              </Card>
            </div>

            {canViewTeamRequests ? (
              <aside className="space-y-4">
                {personalReferencePanel}
              </aside>
            ) : null}
          </div>
        )}
      </ModuleLayout.Content>

      <LeaveDetailDrawer
        open={drawer.isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) drawer.closeDrawer();
        }}
        restoreFocusElement={restoreFocusElement}
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
