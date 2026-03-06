import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useLeaveDrawerState } from '@/modules/leave/hooks/useLeaveDrawerState';
import type { LeaveRequest } from '@/types/hrms';

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

describe('useLeaveDrawerState', () => {
  it('opens, switches tab, and closes using query params', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/leave']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => useLeaveDrawerState({ requests: [request], loading: false }),
      { wrapper },
    );

    expect(result.current.drawerState).toEqual({ requestId: null, tab: 'request' });

    act(() => {
      result.current.openRequest('leave-1');
    });

    expect(result.current.drawerState).toEqual({ requestId: 'leave-1', tab: 'request' });
    expect(result.current.selectedRequest?.id).toBe('leave-1');

    act(() => {
      result.current.setTab('approval');
    });

    expect(result.current.drawerState.tab).toBe('approval');

    act(() => {
      result.current.closeDrawer();
    });

    expect(result.current.drawerState).toEqual({ requestId: null, tab: 'request' });
  });
});
