import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getLeaveWorkflowPresentation } from '@/components/leave/leave-request-context';
import { RequestInfoTab } from '@/modules/leave/components/LeaveDrawer/tabs/RequestInfoTab';
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
    cancellation_route_snapshot: ['manager', 'director'],
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
    document_required: true,
    manager_comments: 'Need itinerary details.',
    amendment_notes: 'Resubmitted with corrected dates.',
    amended_at: '2026-02-02T00:00:00Z',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-02T00:00:00Z',
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
      requires_document: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: null,
    },
    ...overrides,
  };
}

describe('RequestInfoTab', () => {
  it('separates workflow snapshot from request notes and context', () => {
    const request = makeLeaveRequest();

    render(
      <RequestInfoTab
        request={request}
        statusDisplay={{ status: 'pending', label: 'Pending Manager' }}
        workflowPresentation={getLeaveWorkflowPresentation({
          request,
          statusDisplay: { status: 'pending', label: 'Pending Manager' },
          cancellationBadge: { status: 'pending', label: 'Cancellation Pending Manager' },
        })}
        formatDateTime={(value) => value ?? '—'}
      />,
    );

    expect(screen.getByText('Workflow Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Current state:')).toBeInTheDocument();
    expect(screen.getByText('Secondary state:')).toBeInTheDocument();
    expect(screen.getByText('Workflow support:')).toBeInTheDocument();
    expect(screen.getByText('Supporting document:')).toBeInTheDocument();
    expect(screen.getByText('Request Notes & Workflow Context')).toBeInTheDocument();
    expect(screen.getByText('Approver comments')).toBeInTheDocument();
    expect(screen.getByText('Amendment notes')).toBeInTheDocument();
    expect(screen.queryByText('Doc Required')).not.toBeInTheDocument();
  });
});
