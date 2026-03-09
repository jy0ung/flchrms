import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { LeaveRequestWorkspace } from '@/components/leave/LeaveRequestWorkspace';
import type { LeaveRequest } from '@/types/hrms';

vi.mock('@/components/ui/tabs', () => {
  const TabsContext = React.createContext<{
    value: string;
    onValueChange: (next: string) => void;
  } | null>(null);

  function Tabs({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    children: React.ReactNode;
  }) {
    return <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>;
  }

  function TabsList({ children }: { children: React.ReactNode }) {
    return <div role="tablist">{children}</div>;
  }

  function TabsTrigger({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    const context = React.useContext(TabsContext);
    if (!context) return null;
    const selected = context.value === value;
    return (
      <button type="button" role="tab" aria-selected={selected} onClick={() => context.onValueChange(value)}>
        {children}
      </button>
    );
  }

  function TabsContent({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    const context = React.useContext(TabsContext);
    if (!context || context.value !== value) return null;
    return <div role="tabpanel">{children}</div>;
  }

  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

vi.mock('@/components/ui/select', () => {
  const SelectContext = React.createContext<{
    value: string;
    onValueChange: (next: string) => void;
  } | null>(null);

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    children: React.ReactNode;
  }) {
    return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
  }

  function SelectTrigger({ children }: { children: React.ReactNode }) {
    return (
      <button type="button" role="combobox">
        {children}
      </button>
    );
  }

  function SelectValue() {
    const context = React.useContext(SelectContext);
    return <span>{context?.value ?? ''}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    const context = React.useContext(SelectContext);
    if (!context) return null;
    return (
      <button type="button" role="option" onClick={() => context.onValueChange(value)}>
        {children}
      </button>
    );
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

vi.mock('@/components/leave/MyLeaveRequestsTable', () => ({
  MyLeaveRequestsTable: ({
    requests,
    emptyMessage,
  }: {
    requests: LeaveRequest[];
    emptyMessage: string;
  }) => (
    <div data-testid="my-requests-table">
      {requests.length > 0 ? requests.map((request) => request.id).join(', ') : emptyMessage}
    </div>
  ),
}));

vi.mock('@/components/leave/TeamLeaveRequestsTable', () => ({
  TeamLeaveRequestsTable: ({
    requests,
    emptyMessage,
  }: {
    requests: LeaveRequest[];
    emptyMessage: string;
  }) => (
    <div data-testid="team-requests-table">
      {requests.length > 0 ? requests.map((request) => request.id).join(', ') : emptyMessage}
    </div>
  ),
}));

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'leave-1',
    employee_id: 'user-1',
    leave_type_id: 'lt-1',
    start_date: '2026-02-10',
    end_date: '2026-02-12',
    days_count: 3,
    reason: 'Family trip',
    status: 'pending',
    approval_route_snapshot: ['manager', 'general_manager', 'director'],
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
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    employee: {
      id: 'user-1',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    },
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
    ...overrides,
  };
}

const getStatusDisplay = () => ({ status: 'pending', label: 'Pending' });
const getCancellationBadge = () => null;
const noop = vi.fn();

function getVisibleTable(testId: 'my-requests-table' | 'team-requests-table') {
  const tables = screen.getAllByTestId(testId);
  const activeTable = tables.find((node) => {
    const tabPanel = node.closest('[role="tabpanel"]');
    return tabPanel ? !tabPanel.hasAttribute('hidden') : true;
  });

  if (!activeTable) {
    throw new Error(`No visible table found for ${testId}`);
  }

  return activeTable;
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    value: () => false,
    configurable: true,
  });
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    value: () => undefined,
    configurable: true,
  });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    value: () => undefined,
    configurable: true,
  });
});

describe('LeaveRequestWorkspace', () => {
  it('renders segmented options based on role visibility', () => {
    const myCurrent = [makeLeaveRequest({ id: 'my-current-1' })];
    const myHistory = [makeLeaveRequest({ id: 'my-history-1', status: 'director_approved', final_approved_at: '2026-03-01T00:00:00Z' })];
    const teamCurrent = [makeLeaveRequest({ id: 'team-current-1', employee_id: 'user-2' })];
    const teamHistory = [makeLeaveRequest({ id: 'team-history-1', employee_id: 'user-2', status: 'rejected', rejected_at: '2026-03-02T00:00:00Z' })];

    const { rerender } = render(
      <LeaveRequestWorkspace
        role="employee"
        canViewTeamRequests={false}
        myCurrentRequests={myCurrent}
        myHistoryRequests={myHistory}
        teamCurrentRequests={teamCurrent}
        teamHistoryRequests={teamHistory}
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={getCancellationBadge}
        canAmend={() => false}
        canCancelPendingRequest={() => false}
        canRequestCancellation={() => false}
        canApproveCancellation={() => false}
        canApprove={() => false}
        shouldShowLeaveDetailsButton={() => false}
        onAmend={noop}
        onCancel={noop}
        onOpenDetails={noop}
        onCancellationReview={noop}
        onAction={noop}
        workflowInfoPopover={<div>workflow-info</div>}
      />,
    );

    expect(screen.getByRole('tab', { name: /My Current/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /My History/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Team Current/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Team History/ })).not.toBeInTheDocument();

    rerender(
      <LeaveRequestWorkspace
        role="manager"
        canViewTeamRequests
        myCurrentRequests={myCurrent}
        myHistoryRequests={myHistory}
        teamCurrentRequests={teamCurrent}
        teamHistoryRequests={teamHistory}
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={getCancellationBadge}
        canAmend={() => false}
        canCancelPendingRequest={() => false}
        canRequestCancellation={() => false}
        canApproveCancellation={() => false}
        canApprove={() => false}
        shouldShowLeaveDetailsButton={() => false}
        onAmend={noop}
        onCancel={noop}
        onOpenDetails={noop}
        onCancellationReview={noop}
        onAction={noop}
        workflowInfoPopover={<div>workflow-info</div>}
      />,
    );

    expect(screen.getByRole('tab', { name: /Team Current/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Team History/ })).toBeInTheDocument();
  });

  it('switches datasets when segmented view changes', () => {
    render(
      <LeaveRequestWorkspace
        role="employee"
        canViewTeamRequests={false}
        myCurrentRequests={[makeLeaveRequest({ id: 'my-current-row' })]}
        myHistoryRequests={[makeLeaveRequest({ id: 'my-history-row', status: 'director_approved', final_approved_at: '2026-03-01T00:00:00Z' })]}
        teamCurrentRequests={[]}
        teamHistoryRequests={[]}
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={getCancellationBadge}
        canAmend={() => false}
        canCancelPendingRequest={() => false}
        canRequestCancellation={() => false}
        canApproveCancellation={() => false}
        canApprove={() => false}
        shouldShowLeaveDetailsButton={() => false}
        onAmend={noop}
        onCancel={noop}
        onOpenDetails={noop}
        onCancellationReview={noop}
        onAction={noop}
        workflowInfoPopover={<div>workflow-info</div>}
      />,
    );

    expect(getVisibleTable('my-requests-table')).toHaveTextContent('my-current-row');
    expect(getVisibleTable('my-requests-table')).not.toHaveTextContent('my-history-row');

    fireEvent.click(screen.getByRole('tab', { name: /My History/ }));

    expect(getVisibleTable('my-requests-table')).toHaveTextContent('my-history-row');
    expect(getVisibleTable('my-requests-table')).not.toHaveTextContent('my-current-row');
  });

  it('preserves status filter across view switches and treats pending cancellation as pending', () => {
    render(
      <LeaveRequestWorkspace
        role="manager"
        canViewTeamRequests
        myCurrentRequests={[
          makeLeaveRequest({
            id: 'pending-cancellation-row',
            status: 'director_approved',
            final_approved_at: '2026-03-01T00:00:00Z',
            cancellation_status: 'manager_approved',
          }),
        ]}
        myHistoryRequests={[
          makeLeaveRequest({
            id: 'approved-history-row',
            status: 'director_approved',
            final_approved_at: '2026-02-20T00:00:00Z',
          }),
        ]}
        teamCurrentRequests={[]}
        teamHistoryRequests={[]}
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={getCancellationBadge}
        canAmend={() => false}
        canCancelPendingRequest={() => false}
        canRequestCancellation={() => false}
        canApproveCancellation={() => false}
        canApprove={() => false}
        shouldShowLeaveDetailsButton={() => false}
        onAmend={noop}
        onCancel={noop}
        onOpenDetails={noop}
        onCancellationReview={noop}
        onAction={noop}
        workflowInfoPopover={<div>workflow-info</div>}
      />,
    );

    const statusCombobox = screen.getAllByRole('combobox')[0];
    fireEvent.click(statusCombobox);
    fireEvent.click(screen.getByRole('option', { name: 'Pending' }));

    expect(getVisibleTable('my-requests-table')).toHaveTextContent('pending-cancellation-row');
    expect(screen.getByText('Status: Pending')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /My History/ }));

    expect(
      screen.getByText('Try another status filter or clear it to return to your full request list.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Status: Pending')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /My Current/ }));
    expect(getVisibleTable('my-requests-table')).toHaveTextContent('pending-cancellation-row');
  });

  it('syncs to a routed default view when the parent workspace intent changes', () => {
    const myCurrent = [makeLeaveRequest({ id: 'my-current-row' })];
    const teamCurrent = [makeLeaveRequest({ id: 'team-current-row', employee_id: 'user-2' })];

    const { rerender } = render(
      <LeaveRequestWorkspace
        role="manager"
        canViewTeamRequests
        myCurrentRequests={myCurrent}
        myHistoryRequests={[]}
        teamCurrentRequests={teamCurrent}
        teamHistoryRequests={[]}
        defaultView="MY_CURRENT"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={getCancellationBadge}
        canAmend={() => false}
        canCancelPendingRequest={() => false}
        canRequestCancellation={() => false}
        canApproveCancellation={() => false}
        canApprove={() => false}
        shouldShowLeaveDetailsButton={() => false}
        onAmend={noop}
        onCancel={noop}
        onOpenDetails={noop}
        onCancellationReview={noop}
        onAction={noop}
        workflowInfoPopover={<div>workflow-info</div>}
      />,
    );

    expect(getVisibleTable('my-requests-table')).toHaveTextContent('my-current-row');

    rerender(
      <LeaveRequestWorkspace
        role="manager"
        canViewTeamRequests
        myCurrentRequests={myCurrent}
        myHistoryRequests={[]}
        teamCurrentRequests={teamCurrent}
        teamHistoryRequests={[]}
        defaultView="TEAM_CURRENT"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={getCancellationBadge}
        canAmend={() => false}
        canCancelPendingRequest={() => false}
        canRequestCancellation={() => false}
        canApproveCancellation={() => false}
        canApprove={() => false}
        shouldShowLeaveDetailsButton={() => false}
        onAmend={noop}
        onCancel={noop}
        onOpenDetails={noop}
        onCancellationReview={noop}
        onAction={noop}
        workflowInfoPopover={<div>workflow-info</div>}
      />,
    );

    expect(getVisibleTable('team-requests-table')).toHaveTextContent('team-current-row');
  });
});
