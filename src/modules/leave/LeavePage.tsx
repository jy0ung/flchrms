import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Info, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTableShell, MetaBadge, QueryErrorState } from '@/components/system';
import { SummaryRail } from '@/components/workspace/SummaryRail';
import { LeaveBalancePanel } from '@/components/leave/LeaveBalancePanel';
import { LeaveRequestWorkspace } from '@/components/leave/LeaveRequestWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDrawerFocusReturn } from '@/hooks/useDrawerFocusReturn';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useLeaveDisplayPrefs } from '@/hooks/useLeaveDisplayConfig';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { canAccessAdminPage, getLeaveBalancePermissions, isEmployee } from '@/lib/permissions';
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
  const { data: balances, isLoading: balancesLoading } = useLeaveBalance();
  const { visibleBalances } = useLeaveDisplayPrefs(user?.id, role ?? undefined, balances ?? []);
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
  const leaveBalancePermissions = getLeaveBalancePermissions(role);

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
          <span className="hidden lg:inline">Approval guide</span>
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
                <MetaBadge tone="warning">Submit</MetaBadge>
                <span>→</span>
                <MetaBadge tone="info">Manager</MetaBadge>
                <span>→</span>
                <MetaBadge tone="info">GM</MetaBadge>
                <span>→</span>
                <MetaBadge tone="warning">Director</MetaBadge>
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-foreground">Manager:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <MetaBadge tone="info">Submit</MetaBadge>
                <span>→</span>
                <MetaBadge tone="info">GM</MetaBadge>
                <span>→</span>
                <MetaBadge tone="warning">Director</MetaBadge>
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-foreground">GM:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <MetaBadge tone="info">Submit</MetaBadge>
                <span>→</span>
                <MetaBadge tone="warning">Director</MetaBadge>
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

  const workflowContextDescription = canViewTeamRequests
    ? 'Review queue items first. Personal balances stay nearby as a secondary reference.'
    : 'Start with your request queue. Balance and entitlement details stay nearby as supporting reference.';

  const canOpenBalanceAdjustments =
    leaveBalancePermissions.adjust_leave_balance && canAccessAdminPage(role);

  const leaveBalancePanel = leaveBalancePermissions.view_own_leave_balance ? (
    <LeaveBalancePanel
      balances={visibleBalances}
      isLoading={balancesLoading}
      title="My leave balances"
      description={
        canViewTeamRequests
          ? 'Keep your own entitlement visible while you review approvals and team queue activity.'
          : 'Track current entitlement, pending requests, and remaining balance before you submit or review leave.'
      }
      variant={canViewTeamRequests ? 'summary' : 'prominent'}
      maxPrimaryCards={canViewTeamRequests ? 3 : 4}
      defaultCollapsedSecondary={canViewTeamRequests}
      action={canOpenBalanceAdjustments ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => navigate('/admin/leave-policies?workspace=balance-adjustments')}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Adjust balances
        </Button>
      ) : null}
    />
  ) : null;

  return (
    <ModuleLayout maxWidth="7xl" archetype="queue-workspace">
      <ModuleLayout.Header
        eyebrow="Workspace"
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
        actionsSlot={pageActions.canOpenTeamCalendarLink ? (
          <Button
            variant="outline"
            className="h-9 rounded-full"
            aria-label="Open Team Calendar"
            onClick={() => navigate('/calendar')}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            <span className="lg:hidden">Calendar</span>
            <span className="hidden lg:inline">Open Team Calendar</span>
          </Button>
        ) : undefined}
      />

      {isError ? (
        <QueryErrorState label="leave requests" onRetry={() => refetch()} />
      ) : null}

      <ModuleLayout.Content>
        {isLoading ? (
          <DataTableShell
            surfaceVariant="flat"
            title="Leave Requests"
            loading
            loadingSkeleton={(
              <div className="p-4 text-center text-muted-foreground">
                Loading leave requests...
              </div>
            )}
          />
        ) : (
          <div className="space-y-6">
            {canViewTeamRequests ? leaveBalancePanel : null}

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-base">
                  {canViewTeamRequests ? 'Leave approval queue' : 'Leave request queue'}
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

            {!canViewTeamRequests ? leaveBalancePanel : null}

            <SummaryRail items={metricItems} variant="subtle" compactBreakpoint="xl" />
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
