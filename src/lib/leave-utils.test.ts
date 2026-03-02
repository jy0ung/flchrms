import { describe, expect, it } from 'vitest';
import { isCancellationPending } from '@/lib/leave-utils';
import type { LeaveRequest, LeaveCancellationStatus } from '@/types/hrms';

function makeRequest(cancellationStatus: LeaveCancellationStatus | null): LeaveRequest {
  return {
    id: 'req-1',
    employee_id: 'emp-1',
    leave_type_id: 'lt-1',
    start_date: '2026-03-01',
    end_date: '2026-03-05',
    days_count: 5,
    reason: null,
    status: 'director_approved',
    approval_route_snapshot: null,
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
    cancellation_status: cancellationStatus,
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
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
  };
}

describe('isCancellationPending', () => {
  it.each<{ status: LeaveCancellationStatus; expected: boolean }>([
    { status: 'pending', expected: true },
    { status: 'manager_approved', expected: true },
    { status: 'gm_approved', expected: true },
    { status: 'director_approved', expected: true },
    { status: 'approved', expected: false },
    { status: 'rejected', expected: false },
  ])('returns $expected for cancellation_status=$status', ({ status, expected }) => {
    expect(isCancellationPending(makeRequest(status))).toBe(expected);
  });

  it('returns false when cancellation_status is null', () => {
    expect(isCancellationPending(makeRequest(null))).toBe(false);
  });

  it('returns false for a request with no cancellation workflow started', () => {
    const req = makeRequest(null);
    expect(isCancellationPending(req)).toBe(false);
  });
});
