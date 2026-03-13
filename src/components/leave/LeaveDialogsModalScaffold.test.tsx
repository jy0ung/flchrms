import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import { LeaveActionDialog } from '@/components/leave/LeaveActionDialog';
import { LeaveCancellationDialogs } from '@/components/leave/LeaveCancellationDialogs';
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

describe('Leave dialogs modal scaffold integration', () => {
  it('renders LeaveActionDialog with standardized section structure', () => {
    render(
      <LeaveActionDialog
        open
        onOpenChange={vi.fn()}
        request={makeLeaveRequest()}
        actionType="request_document"
        rejectionReason=""
        onRejectionReasonChange={vi.fn()}
        managerComments=""
        onManagerCommentsChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Request Supporting Document/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Document Request Message/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request Document/i })).toBeInTheDocument();
  });

  it('uses stable fallback request labels when employee profile data is unavailable', () => {
    render(
      <LeaveActionDialog
        open
        onOpenChange={vi.fn()}
        request={makeLeaveRequest({
          employee: undefined,
          employee_id: 'delegate-visible-requester',
        })}
        actionType="approve"
        rejectionReason=""
        onRejectionReasonChange={vi.fn()}
        managerComments=""
        onManagerCommentsChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
      />,
    );

    expect(screen.getByText(/delegate-visible-requester - Annual Leave/i)).toBeInTheDocument();
  });

  it('renders cancellation request/review dialogs with modal scaffold headings and sections', () => {
    render(
      <LeaveCancellationDialogs
        requestDialogOpen
        onRequestDialogOpenChange={vi.fn()}
        requestDialogRequest={makeLeaveRequest()}
        requestDialogMode="request_approved_cancel"
        requestReason=""
        onRequestReasonChange={vi.fn()}
        onSubmitRequest={vi.fn()}
        requestSubmitPending={false}
        reviewDialogOpen={false}
        onReviewDialogOpenChange={vi.fn()}
        reviewDialogRequest={null}
        reviewAction="approve"
        reviewComments=""
        onReviewCommentsChange={vi.fn()}
        reviewRejectionReason=""
        onReviewRejectionReasonChange={vi.fn()}
        onSubmitReview={vi.fn()}
        reviewSubmitPending={false}
      />,
    );

    expect(screen.getByRole('heading', { name: /Request Leave Cancellation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cancellation Request/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Cancellation Request/i })).toBeInTheDocument();
  });
});

describe('Leave dialogs keyboard close behavior', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)}>
          Open Leave Action Dialog
        </button>
        <LeaveActionDialog
          open={open}
          onOpenChange={setOpen}
          request={makeLeaveRequest()}
          actionType="approve"
          rejectionReason=""
          onRejectionReasonChange={vi.fn()}
          managerComments=""
          onManagerCommentsChange={vi.fn()}
          onSubmit={vi.fn()}
          isPending={false}
        />
      </div>
    );
  }

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: /Open Leave Action Dialog/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});
