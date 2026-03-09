import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeaveWorkflowActions } from '@/modules/leave/components/LeaveDrawer/LeaveWorkflowActions';
import type { LeaveRequest } from '@/types/hrms';

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

const noop = vi.fn();

describe('LeaveWorkflowActions', () => {
  it('uses an approval-specific heading for approver actions', () => {
    render(
      <LeaveWorkflowActions
        request={makeLeaveRequest()}
        permissions={{
          canOpenDrawer: true,
          canApprove: true,
          canReject: true,
          canRequestDocument: true,
          canAmend: false,
          canCancelPending: false,
          canRequestCancellation: false,
          canApproveCancellation: false,
          canViewDocument: false,
        }}
        onApprove={noop}
        onReject={noop}
        onRequestDocument={noop}
        onAmend={noop}
        onCancel={noop}
        onApproveCancellation={noop}
        onRejectCancellation={noop}
      />,
    );

    expect(screen.getByText('Approval decision required')).toBeInTheDocument();
    expect(screen.getByText('Approve, reject, or ask for supporting documents from the current request.')).toBeInTheDocument();
  });

  it('uses a cancellation-specific heading when a cancellation decision is pending', () => {
    render(
      <LeaveWorkflowActions
        request={makeLeaveRequest({ cancellation_status: 'pending' })}
        permissions={{
          canOpenDrawer: true,
          canApprove: false,
          canReject: false,
          canRequestDocument: false,
          canAmend: false,
          canCancelPending: false,
          canRequestCancellation: false,
          canApproveCancellation: true,
          canViewDocument: false,
        }}
        onApprove={noop}
        onReject={noop}
        onRequestDocument={noop}
        onAmend={noop}
        onCancel={noop}
        onApproveCancellation={noop}
        onRejectCancellation={noop}
      />,
    );

    expect(screen.getByText('Cancellation decision required')).toBeInTheDocument();
    expect(screen.getByText('Resolve the cancellation request here without leaving the workflow context.')).toBeInTheDocument();
  });
});
