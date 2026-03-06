import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeaveDetailDrawer } from '@/modules/leave/components/LeaveDrawer/LeaveDetailDrawer';
import type { LeaveRequest } from '@/types/hrms';

const useLeaveBalanceSpy = vi.fn();
const useLeaveRequestDetailsSpy = vi.fn();

const request: LeaveRequest = {
  id: 'leave-1',
  employee_id: 'user-1',
  leave_type_id: 'lt-1',
  start_date: '2026-03-10',
  end_date: '2026-03-12',
  days_count: 3,
  reason: 'Trip',
  status: 'pending',
  approval_route_snapshot: ['manager'],
  manager_approved_by: null,
  manager_approved_at: null,
  gm_approved_by: null,
  gm_approved_at: null,
  director_approved_by: null,
  director_approved_at: null,
  hr_approved_by: null,
  hr_approved_at: null,
  hr_notified_at: null,
  final_approved_by: null,
  final_approved_by_role: null,
  final_approved_at: null,
  cancellation_status: null,
  cancellation_route_snapshot: null,
  cancellation_requested_by: null,
  cancellation_requested_at: null,
  cancellation_reason: null,
  cancellation_comments: null,
  cancellation_manager_approved_by: null,
  cancellation_manager_approved_at: null,
  cancellation_gm_approved_by: null,
  cancellation_gm_approved_at: null,
  cancellation_director_approved_by: null,
  cancellation_director_approved_at: null,
  cancellation_final_approved_by: null,
  cancellation_final_approved_by_role: null,
  cancellation_final_approved_at: null,
  cancellation_rejected_by: null,
  cancellation_rejected_at: null,
  cancellation_rejection_reason: null,
  cancelled_by: null,
  cancelled_by_role: null,
  cancelled_at: null,
  rejected_by: null,
  rejected_at: null,
  rejection_reason: null,
  document_url: 'docs/leave.pdf',
  document_required: false,
  manager_comments: null,
  amendment_notes: null,
  amended_at: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  employee: { id: 'user-1', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' },
  leave_type: {
    id: 'lt-1',
    name: 'Annual Leave',
    description: null,
    days_allowed: 14,
    is_paid: true,
    min_days: 1,
    requires_document: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  },
};

vi.mock('@/layouts/ModuleLayout', () => {
  const Root = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Header = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Toolbar = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Content = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const DetailDrawer = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

  return {
    ModuleLayout: Object.assign(Root, {
      Header,
      Toolbar,
      Content,
      DetailDrawer,
    }),
  };
});

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useLeaveBalance', () => ({
  useLeaveBalance: (...args: unknown[]) => useLeaveBalanceSpy(...args),
}));

vi.mock('@/modules/leave/hooks/useLeaveRequestDetails', () => ({
  useLeaveRequestDetails: (...args: unknown[]) => useLeaveRequestDetailsSpy(...args),
}));

vi.mock('@/modules/leave/components/LeaveDrawer/LeaveDrawerTabs', () => ({
  LeaveDrawerTabs: () => null,
}));

vi.mock('@/modules/leave/components/LeaveDrawer/LeaveWorkflowActions', () => ({
  LeaveWorkflowActions: () => null,
}));

vi.mock('@/modules/leave/components/LeaveDrawer/tabs/RequestInfoTab', () => ({
  RequestInfoTab: () => null,
}));

vi.mock('@/modules/leave/components/LeaveDrawer/tabs/BalanceContextTab', () => ({
  BalanceContextTab: () => null,
}));

vi.mock('@/modules/leave/components/LeaveDrawer/tabs/ApprovalHistoryTab', () => ({
  ApprovalHistoryTab: () => null,
}));

vi.mock('@/modules/leave/components/LeaveDrawer/tabs/CancellationHistoryTab', () => ({
  CancellationHistoryTab: () => null,
}));

vi.mock('@/modules/leave/components/LeaveDrawer/tabs/DocumentsTab', () => ({
  DocumentsTab: () => null,
}));

describe('LeaveDetailDrawer query gating', () => {
  beforeEach(() => {
    useLeaveBalanceSpy.mockReset().mockReturnValue({ data: [], isLoading: false, error: null });
    useLeaveRequestDetailsSpy.mockReset().mockReturnValue({
      approvalTimelineEvents: [],
      cancellationTimelineEvents: [],
      eventsLoading: false,
      actorsLoading: false,
      getActorLabel: vi.fn(),
    });
  });

  it('disables leave balance and details queries while closed', () => {
    render(
      <LeaveDetailDrawer
        open={false}
        onOpenChange={vi.fn()}
        request={null}
        loading={false}
        isUnavailable={false}
        tab="request"
        onTabChange={vi.fn()}
        statusDisplay={null}
        cancellationBadge={null}
        rowPermissions={null}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRequestDocument={vi.fn()}
        onAmend={vi.fn()}
        onCancel={vi.fn()}
        onApproveCancellation={vi.fn()}
        onRejectCancellation={vi.fn()}
      />,
    );

    expect(useLeaveBalanceSpy).toHaveBeenCalledWith(undefined, undefined, { enabled: false });
    expect(useLeaveRequestDetailsSpy).toHaveBeenCalledWith({ request: null, enabled: false });
  });

  it('enables only the balance query on the balance tab', () => {
    render(
      <LeaveDetailDrawer
        open
        onOpenChange={vi.fn()}
        request={request}
        loading={false}
        isUnavailable={false}
        tab="balance"
        onTabChange={vi.fn()}
        statusDisplay={{ status: 'pending', label: 'Pending' }}
        cancellationBadge={null}
        rowPermissions={{
          canOpenDrawer: true,
          canApprove: false,
          canReject: false,
          canRequestDocument: false,
          canAmend: false,
          canCancelPending: false,
          canRequestCancellation: false,
          canApproveCancellation: false,
          canViewDocument: true,
        }}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRequestDocument={vi.fn()}
        onAmend={vi.fn()}
        onCancel={vi.fn()}
        onApproveCancellation={vi.fn()}
        onRejectCancellation={vi.fn()}
      />,
    );

    expect(useLeaveBalanceSpy).toHaveBeenCalledWith('user-1', undefined, { enabled: true });
    expect(useLeaveRequestDetailsSpy).toHaveBeenCalledWith({ request, enabled: false });
  });

  it('enables request details only on the approval tab', () => {
    render(
      <LeaveDetailDrawer
        open
        onOpenChange={vi.fn()}
        request={request}
        loading={false}
        isUnavailable={false}
        tab="approval"
        onTabChange={vi.fn()}
        statusDisplay={{ status: 'pending', label: 'Pending' }}
        cancellationBadge={null}
        rowPermissions={{
          canOpenDrawer: true,
          canApprove: false,
          canReject: false,
          canRequestDocument: false,
          canAmend: false,
          canCancelPending: false,
          canRequestCancellation: false,
          canApproveCancellation: false,
          canViewDocument: true,
        }}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRequestDocument={vi.fn()}
        onAmend={vi.fn()}
        onCancel={vi.fn()}
        onApproveCancellation={vi.fn()}
        onRejectCancellation={vi.fn()}
      />,
    );

    expect(useLeaveBalanceSpy).toHaveBeenCalledWith('user-1', undefined, { enabled: false });
    expect(useLeaveRequestDetailsSpy).toHaveBeenCalledWith({ request, enabled: true });
  });
});
