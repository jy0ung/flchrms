import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamLeaveRequestsTable } from '@/components/leave/TeamLeaveRequestsTable';
import type { LeaveRequest } from '@/types/hrms';

vi.mock('@/components/leave/DocumentViewButton', () => ({
  DocumentViewButton: ({ documentPath }: { documentPath: string }) => (
    <button type="button">View Doc: {documentPath}</button>
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

describe('TeamLeaveRequestsTable', () => {
  const getStatusDisplay = () => ({
    color: 'bg-muted',
    icon: null,
    label: 'Pending Manager',
  });

  it('renders empty state message', () => {
    render(
      <TeamLeaveRequestsTable
        requests={[]}
        emptyMessage="No team leave requests"
        role="manager"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={() => null}
        shouldShowLeaveDetailsButton={() => false}
        canApproveCancellation={() => false}
        canApprove={() => false}
        onOpenDetails={vi.fn()}
        onCancellationReview={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText('No team leave requests')).toBeInTheDocument();
  });

  it('opens details and shows document button for manager but not admin', () => {
    const onOpenDetails = vi.fn();
    const request = makeLeaveRequest({ document_url: 'user-1/doc.pdf' });

    const { rerender } = render(
      <TeamLeaveRequestsTable
        requests={[request]}
        emptyMessage="No requests"
        role="manager"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={() => null}
        shouldShowLeaveDetailsButton={() => true}
        canApproveCancellation={() => false}
        canApprove={() => false}
        onOpenDetails={onOpenDetails}
        onCancellationReview={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Details/i })[0]);
    expect(onOpenDetails).toHaveBeenCalledWith(request);
    expect(screen.getAllByText(/View Doc: user-1\/doc\.pdf/).length).toBeGreaterThan(0);

    rerender(
      <TeamLeaveRequestsTable
        requests={[request]}
        emptyMessage="No requests"
        role="admin"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={() => null}
        shouldShowLeaveDetailsButton={() => true}
        canApproveCancellation={() => false}
        canApprove={() => false}
        onOpenDetails={onOpenDetails}
        onCancellationReview={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.queryByText(/View Doc: user-1\/doc\.pdf/)).not.toBeInTheDocument();
  });

  it('renders cancellation review actions when approver can approve cancellation', () => {
    render(
      <TeamLeaveRequestsTable
        requests={[makeLeaveRequest({ cancellation_status: 'pending', cancellation_reason: 'Trip changed' })]}
        emptyMessage="No requests"
        role="director"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={() => ({ className: 'text-amber-600', label: 'Cancellation Pending' })}
        shouldShowLeaveDetailsButton={() => true}
        canApproveCancellation={() => true}
        canApprove={() => false}
        onOpenDetails={vi.fn()}
        onCancellationReview={vi.fn()}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: /Approve Cancel/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Reject Cancel/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cancellation Pending/i).length).toBeGreaterThan(0);
  });

  it('shows request document action only for manager on pending stage', () => {
    const onAction = vi.fn();

    const { rerender } = render(
      <TeamLeaveRequestsTable
        requests={[makeLeaveRequest({ status: 'pending' })]}
        emptyMessage="No requests"
        role="manager"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={() => null}
        shouldShowLeaveDetailsButton={() => false}
        canApproveCancellation={() => false}
        canApprove={() => true}
        onOpenDetails={vi.fn()}
        onCancellationReview={vi.fn()}
        onAction={onAction}
      />,
    );

    expect(screen.getAllByRole('button', { name: /Request Doc/i }).length).toBeGreaterThan(0);

    rerender(
      <TeamLeaveRequestsTable
        requests={[makeLeaveRequest({ status: 'manager_approved' })]}
        emptyMessage="No requests"
        role="manager"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={() => null}
        shouldShowLeaveDetailsButton={() => false}
        canApproveCancellation={() => false}
        canApprove={() => true}
        onOpenDetails={vi.fn()}
        onCancellationReview={vi.fn()}
        onAction={onAction}
      />,
    );

    expect(screen.queryByRole('button', { name: /Request Doc/i })).not.toBeInTheDocument();

    rerender(
      <TeamLeaveRequestsTable
        requests={[makeLeaveRequest({ status: 'pending' })]}
        emptyMessage="No requests"
        role="general_manager"
        getStatusDisplay={getStatusDisplay}
        getCancellationBadge={() => null}
        shouldShowLeaveDetailsButton={() => false}
        canApproveCancellation={() => false}
        canApprove={() => true}
        onOpenDetails={vi.fn()}
        onCancellationReview={vi.fn()}
        onAction={onAction}
      />,
    );

    expect(screen.queryByRole('button', { name: /Request Doc/i })).not.toBeInTheDocument();
  });
});
