import { format } from 'date-fns';
import { CalendarDays, Clock3, Loader2, UserSquare2 } from 'lucide-react';

import { ModuleLayout } from '@/layouts/ModuleLayout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { DrawerMetaHeader } from '@/components/workspace/DrawerMetaHeader';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { LeaveDrawerTabs } from '@/modules/leave/components/LeaveDrawer/LeaveDrawerTabs';
import { LeaveWorkflowActions } from '@/modules/leave/components/LeaveDrawer/LeaveWorkflowActions';
import { ApprovalHistoryTab } from '@/modules/leave/components/LeaveDrawer/tabs/ApprovalHistoryTab';
import { BalanceContextTab } from '@/modules/leave/components/LeaveDrawer/tabs/BalanceContextTab';
import { CancellationHistoryTab } from '@/modules/leave/components/LeaveDrawer/tabs/CancellationHistoryTab';
import { DocumentsTab } from '@/modules/leave/components/LeaveDrawer/tabs/DocumentsTab';
import { RequestInfoTab } from '@/modules/leave/components/LeaveDrawer/tabs/RequestInfoTab';
import { useLeaveRequestDetails } from '@/modules/leave/hooks/useLeaveRequestDetails';
import { getLeaveRequestDrawerTitle, getLeaveRequestEmployeeName } from '@/lib/leave-request-display';
import type {
  LeaveCancellationBadge,
  LeaveDrawerTab,
  LeaveRequestStatusDisplay,
  LeaveRowActionPermissions,
} from '@/modules/leave/types';
import type { LeaveRequest } from '@/types/hrms';

interface LeaveDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
  loading: boolean;
  isUnavailable: boolean;
  tab: LeaveDrawerTab;
  onTabChange: (tab: LeaveDrawerTab) => void;
  statusDisplay: LeaveRequestStatusDisplay | null;
  cancellationBadge: LeaveCancellationBadge;
  rowPermissions: LeaveRowActionPermissions | null;
  onApprove: (request: LeaveRequest) => void;
  onReject: (request: LeaveRequest) => void;
  onRequestDocument: (request: LeaveRequest) => void;
  onAmend: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
  onApproveCancellation: (request: LeaveRequest) => void;
  onRejectCancellation: (request: LeaveRequest) => void;
}

export function LeaveDetailDrawer({
  open,
  onOpenChange,
  request,
  loading,
  isUnavailable,
  tab,
  onTabChange,
  statusDisplay,
  cancellationBadge,
  rowPermissions,
  onApprove,
  onReject,
  onRequestDocument,
  onAmend,
  onCancel,
  onApproveCancellation,
  onRejectCancellation,
}: LeaveDetailDrawerProps) {
  const showCancellationTab = Boolean(request?.cancellation_status || request?.cancelled_at);
  const showDocumentsTab = Boolean(request?.document_url && rowPermissions?.canViewDocument);
  const resolvedTab: LeaveDrawerTab = tab === 'documents' && !showDocumentsTab
    ? 'request'
    : tab === 'cancellation' && !showCancellationTab
      ? 'request'
      : tab;

  const detailsEnabled = open && !!request && (resolvedTab === 'approval' || resolvedTab === 'cancellation');
  const {
    approvalTimelineEvents,
    cancellationTimelineEvents,
    eventsLoading,
    actorsLoading,
    getActorLabel,
  } = useLeaveRequestDetails({
    request,
    enabled: detailsEnabled,
  });

  const balanceQuery = useLeaveBalance(
    request?.employee_id,
    undefined,
    { enabled: open && !!request && resolvedTab === 'balance' },
  );

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    return format(new Date(value), 'PPp');
  };

  const title = getLeaveRequestDrawerTitle(request);
  const requesterName = request ? getLeaveRequestEmployeeName(request) : '—';
  const rangeLabel = request
    ? `${format(new Date(request.start_date), 'PP')} - ${format(new Date(request.end_date), 'PP')}`
    : '—';

  return (
    <ModuleLayout.DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={statusDisplay ? statusDisplay.label : 'Workflow details for the selected leave request.'}
    >
      {loading ? (
        <WorkspaceStatePanel
          title="Loading leave request details"
          description="Pulling workflow history, balances, and document context for the selected request."
          icon={Loader2}
          animateIcon
          appearance="default"
        />
      ) : null}

      {isUnavailable ? (
        <WorkspaceStatePanel
          title="Leave request unavailable"
          description="This leave request is not available in the current workspace."
        />
      ) : null}

      {!loading && !isUnavailable && request && statusDisplay ? (
        <Tabs value={resolvedTab} onValueChange={(next) => onTabChange(next as LeaveDrawerTab)} className="space-y-4">
          <DrawerMetaHeader
            badges={(
              <>
                <Badge variant="outline">{statusDisplay.label}</Badge>
                {cancellationBadge ? <Badge variant="outline">{cancellationBadge.label}</Badge> : null}
              </>
            )}
            description={request.reason || 'No request note provided.'}
            metaItems={[
              {
                id: 'requester',
                label: 'Requester',
                value: requesterName,
                icon: UserSquare2,
              },
              {
                id: 'dates',
                label: 'Dates',
                value: rangeLabel,
                icon: CalendarDays,
              },
              {
                id: 'duration',
                label: 'Duration',
                value: `${request.days_count} day${request.days_count === 1 ? '' : 's'}`,
                icon: Clock3,
              },
              {
                id: 'submitted',
                label: 'Submitted',
                value: formatDateTime(request.created_at),
                icon: CalendarDays,
              },
            ]}
          />

          {rowPermissions ? (
            <LeaveWorkflowActions
              request={request}
              permissions={rowPermissions}
              onApprove={onApprove}
              onReject={onReject}
              onRequestDocument={onRequestDocument}
              onAmend={onAmend}
              onCancel={onCancel}
              onApproveCancellation={onApproveCancellation}
              onRejectCancellation={onRejectCancellation}
            />
          ) : null}

          <LeaveDrawerTabs
            showCancellationTab={showCancellationTab}
            showDocumentsTab={showDocumentsTab}
          />

          <TabsContent value="request" className="mt-0">
            <RequestInfoTab
              request={request}
              statusDisplay={statusDisplay}
              cancellationBadge={cancellationBadge}
              formatDateTime={formatDateTime}
            />
          </TabsContent>

          <TabsContent value="balance" className="mt-0">
            <BalanceContextTab
              request={request}
              balances={balanceQuery.data}
              isLoading={balanceQuery.isLoading}
              error={balanceQuery.error}
            />
          </TabsContent>

          <TabsContent value="approval" className="mt-0">
            <ApprovalHistoryTab
              request={request}
              events={approvalTimelineEvents}
              isLoading={eventsLoading || actorsLoading}
              formatDateTime={formatDateTime}
              getActorLabel={getActorLabel}
            />
          </TabsContent>

          {showCancellationTab ? (
            <TabsContent value="cancellation" className="mt-0">
              <CancellationHistoryTab
                request={request}
                events={cancellationTimelineEvents}
                isLoading={eventsLoading || actorsLoading}
                formatDateTime={formatDateTime}
                getActorLabel={getActorLabel}
              />
            </TabsContent>
          ) : null}

          {showDocumentsTab ? (
            <TabsContent value="documents" className="mt-0">
              <DocumentsTab request={request} />
            </TabsContent>
          ) : null}
        </Tabs>
      ) : null}
    </ModuleLayout.DetailDrawer>
  );
}
