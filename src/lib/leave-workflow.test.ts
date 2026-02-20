import { describe, expect, it } from 'vitest';
import {
  BALANCE_PENDING_STATUSES,
  CALENDAR_VISIBLE_LEAVE_STATUSES,
  buildLeaveApprovalUpdate,
} from '@/lib/leave-workflow';

describe('leave workflow', () => {
  const approverId = '00000000-0000-0000-0000-000000000001';
  const now = '2026-02-20T00:00:00.000Z';

  it('marks manager approval from pending', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      now,
    });

    expect(update.status).toBe('manager_approved');
    expect(update.manager_approved_by).toBe(approverId);
    expect(update.manager_approved_at).toBe(now);
  });

  it('allows GM to approve manager pending requests and notify HR', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'general_manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'manager',
      now,
    });

    expect(update.status).toBe('gm_approved');
    expect(update.hr_notified_at).toBe(now);
  });

  it('blocks GM from approving a regular employee pending request', () => {
    expect(() =>
      buildLeaveApprovalUpdate({
        action: 'approve',
        approverRole: 'general_manager',
        approverId,
        currentStatus: 'pending',
        requesterRole: 'employee',
        now,
      }),
    ).toThrow('current approval stage');
  });

  it('keeps GM self-leave in director path', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'general_manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'general_manager',
      now,
    });

    expect(update.status).toBe('gm_approved');
    expect(update.hr_notified_at).toBeUndefined();
  });

  it('supports manager document request on pending status', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'request_document',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      managerComments: 'Attach medical certificate.',
      now,
    });

    expect(update.document_required).toBe(true);
    expect(update.manager_comments).toBe('Attach medical certificate.');
  });

  it('includes full pending statuses for balances and calendar visibility', () => {
    expect(BALANCE_PENDING_STATUSES).toEqual([
      'pending',
      'manager_approved',
      'gm_approved',
      'director_approved',
    ]);

    expect(CALENDAR_VISIBLE_LEAVE_STATUSES).toEqual([
      'manager_approved',
      'gm_approved',
      'director_approved',
      'hr_approved',
    ]);
  });
});
