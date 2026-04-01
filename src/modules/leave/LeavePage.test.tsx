import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LeavePage } from '@/modules/leave/LeavePage';

const openRequestWizard = vi.fn();
let mockRole: 'employee' | 'manager' | 'admin' = 'employee';
let mockCanViewTeamRequests = false;
let mockCanOpenTeamCalendarLink = false;

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

function labelFromView(view: string) {
  return view
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, role: mockRole }),
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

vi.mock('@/hooks/useLeaveDisplayConfig', () => ({
  useLeaveDisplayPrefs: () => ({ visibleBalances: [] }),
}));

vi.mock('@/modules/leave/hooks/useLeaveCapabilities', () => ({
  useLeaveCapabilities: () => ({
    pageActions: {
      canCreateRequest: true,
      canViewTeamRequests: mockCanViewTeamRequests,
      canOpenTeamCalendarLink: mockCanOpenTeamCalendarLink,
    },
    delegatedApprovalAccess: null,
    defaultWorkspaceView: () => (mockCanViewTeamRequests ? 'TEAM_CURRENT' : 'MY_CURRENT'),
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
    canViewRequestAtCurrentApprovalStage: () => mockCanViewTeamRequests,
  }),
}));

vi.mock('@/modules/leave/hooks/useLeaveWorkflowController', () => ({
  useLeaveWorkflowController: () => ({
    openRequestWizard,
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
  const Header = ({
    title,
    description,
    actionsSlot,
  }: {
    title: string;
    description?: string;
    actionsSlot?: ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
      {actionsSlot}
    </div>
  );
  const Toolbar = ({ children, trailingSlot }: { children?: ReactNode; trailingSlot?: ReactNode }) => (
    <div>
      {children}
      {trailingSlot}
    </div>
  );
  const WorkspaceLead = ({ title, description, metaSlot, children }: { title: string; description?: string; metaSlot?: ReactNode; children?: ReactNode }) => (
    <section>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
      {metaSlot}
      {children}
    </section>
  );
  const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const Summary = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const DetailDrawer = ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null;

  return {
    ModuleLayout: Object.assign(Root, {
      Header,
      Toolbar,
      WorkspaceLead,
      Content,
      Summary,
      DetailDrawer,
    }),
  };
});

vi.mock('@/components/system', () => ({
  ContextChip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  DataTableShell: ({ content }: { content?: ReactNode }) => <div>{content}</div>,
  MetaBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  QueryErrorState: () => null,
}));

vi.mock('@/components/workspace/SummaryRail', () => ({
  SummaryRail: () => <div data-testid="leave-summary-rail">summary-rail</div>,
}));

vi.mock('@/components/leave/LeaveBalancePanel', () => ({
  LeaveBalancePanel: ({
    title,
    action,
  }: {
    title: string;
    action?: ReactNode;
  }) => (
    <section data-testid="leave-balance-panel">
      <div>{title}</div>
      {action}
    </section>
  ),
}));

vi.mock('@/components/leave/LeaveRequestWorkspace', () => ({
  LeaveRequestWorkspace: ({
    myCurrentRequests,
    onOpenDetails,
    defaultView,
    workflowInfoPopover,
  }: {
    myCurrentRequests: typeof leaveRecord[];
    onOpenDetails: (request: typeof leaveRecord) => void;
    defaultView?: string;
    workflowInfoPopover?: ReactNode;
  }) => (
    <div>
      <div>{`default-view:${defaultView}`}</div>
      {workflowInfoPopover}
      <button type="button" onClick={() => onOpenDetails(myCurrentRequests[0])}>open-details</button>
    </div>
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
  beforeEach(() => {
    mockRole = 'employee';
    mockCanViewTeamRequests = false;
    mockCanOpenTeamCalendarLink = false;
    openRequestWizard.mockClear();
  });

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

  it('opens the request wizard from a routed command intent and honors a requested workspace view', () => {
    render(
      <MemoryRouter initialEntries={['/leave?command=request&workspaceView=TEAM_CURRENT']}>
        <LocationProbe />
        <LeavePage />
      </MemoryRouter>,
    );

    expect(openRequestWizard).toHaveBeenCalledTimes(1);
    expect(screen.getByText('default-view:TEAM_CURRENT')).toBeInTheDocument();
    expect(screen.getByText('search:?workspaceView=TEAM_CURRENT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approval workflow guide/i })).toBeInTheDocument();
  });

  it('uses distinct employee and approver copy', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/leave']}>
        <LeavePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Your leave requests, balances, and history in one workspace.')).toBeInTheDocument();
    expect(screen.getByText('Self-service workspace')).toBeInTheDocument();
    expect(screen.getByText('My current requests')).toBeInTheDocument();
    expect(screen.getByText('Balance context')).toBeInTheDocument();
    expect(screen.getByText(`Current view: ${labelFromView('MY_CURRENT')}`)).toBeInTheDocument();

    mockRole = 'manager';
    mockCanViewTeamRequests = true;
    mockCanOpenTeamCalendarLink = true;

    rerender(
      <MemoryRouter initialEntries={['/leave']}>
        <LeavePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Review team requests and work approval queues in context.')).toBeInTheDocument();
    expect(screen.getByText('Approval workspace')).toBeInTheDocument();
    expect(screen.getByText('Team approval queue')).toBeInTheDocument();
    expect(screen.getByText('Personal balance reference')).toBeInTheDocument();
    expect(screen.getByText('default-view:TEAM_CURRENT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Team Calendar/i })).toBeInTheDocument();
  });

  it('renders the request workspace ahead of the supporting summary rail', () => {
    render(
      <MemoryRouter initialEntries={['/leave']}>
        <LeavePage />
      </MemoryRouter>,
    );

    const workspace = screen.getByText('default-view:MY_CURRENT');
    const summaryRail = screen.getByTestId('leave-summary-rail');

    expect(
      workspace.compareDocumentPosition(summaryRail) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps personal balances in the shared leave lead across employee and approver workspaces', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/leave']}>
        <LeavePage />
      </MemoryRouter>,
    );

    const employeeBalancePanel = screen.getByTestId('leave-balance-panel');
    const employeeQueue = screen.getByText('default-view:MY_CURRENT');

    expect(
      employeeBalancePanel.compareDocumentPosition(employeeQueue) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    mockRole = 'manager';
    mockCanViewTeamRequests = true;

    rerender(
      <MemoryRouter initialEntries={['/leave']}>
        <LeavePage />
      </MemoryRouter>,
    );

    const managerBalancePanel = screen.getByTestId('leave-balance-panel');
    const managerQueue = screen.getByText('default-view:TEAM_CURRENT');

    expect(
      managerBalancePanel.compareDocumentPosition(managerQueue) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
