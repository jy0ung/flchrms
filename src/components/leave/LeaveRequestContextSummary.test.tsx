import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeaveRequestContextSummary } from '@/components/leave/LeaveRequestContextSummary';
import {
  getLeaveRequestAttentionLabel,
  getLeaveWorkflowPresentation,
  getLeaveWorkflowSupportNotes,
} from '@/components/leave/leave-request-context';
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

describe('LeaveRequestContextSummary', () => {
  it('renders a compact request note and caps extra workflow updates', () => {
    render(
      <LeaveRequestContextSummary
        request={makeLeaveRequest({
          manager_comments: 'Please attach receipts.',
          amendment_notes: 'Resubmitted after date change.',
          cancellation_reason: 'Project rescheduled.',
        })}
        mode="compact"
        attentionLabel="Approval decision required"
      />,
    );

    expect(screen.getByText('Approval decision required')).toBeInTheDocument();
    expect(screen.getByText('Request note')).toBeInTheDocument();
    expect(screen.getByText('Family trip')).toBeInTheDocument();
    expect(screen.getByText('+1 more workflow update in request details')).toBeInTheDocument();
  });

  it('derives attention labels from the current action state', () => {
    const request = makeLeaveRequest({ document_required: true });
    const amendmentRequest = makeLeaveRequest({ document_required: false });

    expect(getLeaveRequestAttentionLabel({ request, canApproveCancellation: true })).toBe('Cancellation decision required');
    expect(getLeaveRequestAttentionLabel({ request, canApprove: true })).toBe('Approval decision required');
    expect(getLeaveRequestAttentionLabel({ request, canRequestDocument: true })).toBe('Document follow-up available');
    expect(getLeaveRequestAttentionLabel({ request: amendmentRequest, canAmend: true })).toBe('Action needed: amend request');
  });

  it('builds compact workflow support notes for the list surfaces', () => {
    const request = makeLeaveRequest({
      document_required: true,
      amended_at: '2026-02-15T00:00:00Z',
    });

    expect(getLeaveWorkflowSupportNotes(request)).toEqual([
      'Supporting document requested',
      'Updated after amendment',
    ]);

    expect(
      getLeaveWorkflowSupportNotes(
        makeLeaveRequest({
          document_url: 'user-1/doc.pdf',
        }),
      ),
    ).toEqual(['Supporting document attached']);
  });

  it('builds a unified workflow presentation with one secondary status and support text', () => {
    const request = makeLeaveRequest({
      document_required: true,
      amended_at: '2026-02-15T00:00:00Z',
    });

    expect(
      getLeaveWorkflowPresentation({
        request,
        statusDisplay: { status: 'pending', label: 'Pending Manager' },
        cancellationBadge: { status: 'pending', label: 'Cancellation Pending Manager' },
      }),
    ).toEqual({
      primaryStatus: { status: 'pending', label: 'Pending Manager' },
      secondaryStatus: { status: 'pending', label: 'Cancellation Pending Manager' },
      supportText: 'Supporting document requested • Updated after amendment',
    });
  });
});
