import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LeavePage } from '@/modules/leave/LeavePage';

const leaveRecord = {
  id: 'leave-1',
  employee_id: 'user-1',
  leave_type_id: 'lt-1',
  start_date: '2026-03-10',
  end_date: '2026-03-12',
  days_count: 3,
  reason: 'Trip',
  status: 'pending' as const,
  approval_route_snapshot: ['manager'] as const,
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
  document_url: null,
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, role: 'employee' }),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: () => undefined,
}));

vi.mock('@/hooks/useLeaveRequests', () => ({
  useLeaveRequests: () => ({ data: [leaveRecord], isLoading: false, isError: false, refetch: vi.fn() }),
}));

vi.mock('@/hooks/useLeaveTypes', () => ({
  useLeaveTypes: () => ({ data: [leaveRecord.leave_type] }),
}));

vi.mock('@/hooks/useLeaveBalance', () => ({
  useLeaveBalance: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@/modules/leave/hooks/useLeaveCapabilities', () => ({
  useLeaveCapabilities: () => ({
    pageActions: {
      canCreateRequest: true,
      canViewTeamRequests: false,
      canOpenTeamCalendarLink: false,
    },
    delegatedApprovalAccess: null,
    defaultWorkspaceView: () => 'MY_CURRENT',
    getStatusDisplay: () => ({ status: 'pending', label: 'Pending' }),
    getCancellationBadge: () => null,
    getRowPermissions: () => ({
      canOpenDrawer: true,
      canApprove: false,
      canReject: false,
      canRequestDocument: false,
      canAmend: false,
      canCancelPending: false,
      canRequestCancellation: false,
      canApproveCancellation: false,
      canViewDocument: false,
    }),
    isHistoricalRequest: () => false,
    canViewRequestAtCurrentApprovalStage: () => false,
  }),
}));

vi.mock('@/modules/leave/hooks/useLeaveWorkflowController', () => ({
  useLeaveWorkflowController: () => ({
    openRequestWizard: vi.fn(),
    openAmendDialog: vi.fn(),
    openCancellationDialog: vi.fn(),
    openCancellationReviewDialog: vi.fn(),
    openActionDialog: vi.fn(),
    requestWizardOpen: false,
    actionDialogOpen: false,
    amendDialogOpen: false,
    selectedRequest: null,
    cancellationDialogOpen: false,
    cancellationDialogRequest: null,
    cancellationDialogMode: 'pending_cancel',
    cancellationRequestReason: '',
    cancellationReviewDialogOpen: false,
    cancellationReviewRequest: null,
    cancellationReviewAction: 'approve',
    cancellationReviewComments: '',
    cancellationReviewRejectionReason: '',
    actionType: 'approve',
    managerComments: '',
    rejectionReason: '',
    amendmentNotes: '',
    documentFile: null,
    createPending: false,
    previewPending: false,
    actionPending: false,
    amendPending: false,
    uploadPending: false,
    cancellationPending: false,
    cancellationReviewPending: false,
    handleRequestWizardOpenChange: vi.fn(),
    handlePreview: vi.fn(),
    handleUploadDocument: vi.fn(),
    handleSubmitRequest: vi.fn(),
    handleActionDialogOpenChange: vi.fn(),
    submitAction: vi.fn(),
    handleAmendDialogOpenChange: vi.fn(),
    submitAmendment: vi.fn(),
    handleCancellationDialogOpenChange: vi.fn(),
    submitCancellationRequest: vi.fn(),
    handleCancellationReviewDialogOpenChange: vi.fn(),
    submitCancellationReview: vi.fn(),
    setManagerComments: vi.fn(),
    setRejectionReason: vi.fn(),
    setAmendmentNotes: vi.fn(),
    setDocumentFile: vi.fn(),
    setCancellationRequestReason: vi.fn(),
    setCancellationReviewComments: vi.fn(),
    setCancellationReviewRejectionReason: vi.fn(),
  }),
}));

vi.mock('@/layouts/ModuleLayout', () => {
  const Root = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Header = ({ title }: { title: string }) => <div>{title}</div>;
  const Toolbar = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const DetailDrawer = ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null;

  return {
    ModuleLayout: Object.assign(Root, {
      Header,
      Toolbar,
      Content,
      DetailDrawer,
    }),
  };
});

vi.mock('@/components/system', () => ({
  DataTableShell: ({ content }: { content?: ReactNode }) => <div>{content}</div>,
  QueryErrorState: () => null,
}));

vi.mock('@/components/leave/LeaveBalanceSection', () => ({
  LeaveBalanceSection: () => null,
}));

vi.mock('@/components/leave/LeaveRequestWorkspace', () => ({
  LeaveRequestWorkspace: ({ myCurrentRequests, onOpenDetails }: { myCurrentRequests: typeof leaveRecord[]; onOpenDetails: (request: typeof leaveRecord) => void }) => (
    <button type="button" onClick={() => onOpenDetails(myCurrentRequests[0])}>open-details</button>
  ),
}));

vi.mock('@/modules/leave/components/LeaveManagementDialogs', () => ({
  LeaveManagementDialogs: () => null,
}));

vi.mock('@/modules/leave/components/LeaveDrawer/LeaveDetailDrawer', () => ({
  LeaveDetailDrawer: ({ open, request, tab }: { open: boolean; request: typeof leaveRecord | null; tab: string }) =>
    open ? <div>{`drawer:${request?.id}:${tab}`}</div> : null,
}));

function LocationProbe() {
  const location = useLocation();
  return <div>{`search:${location.search}`}</div>;
}

describe('LeavePage', () => {
  it('opens the leave detail drawer and syncs the query params', () => {
    render(
      <MemoryRouter initialEntries={['/leave']}>
        <LocationProbe />
        <LeavePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open-details' }));

    expect(screen.getByText('drawer:leave-1:request')).toBeInTheDocument();
    expect(screen.getByText('search:?requestId=leave-1&tab=request')).toBeInTheDocument();
  });
});
