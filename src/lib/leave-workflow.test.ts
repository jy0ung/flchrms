import { describe, expect, it } from 'vitest';
import {
  adaptDepartmentWorkflowStagesForRequesterRole,
  BALANCE_PENDING_STATUSES,
  CALENDAR_VISIBLE_LEAVE_STATUSES,
  buildLeaveApprovalUpdate,
  buildLeaveCancellationApprovalUpdate,
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

  it('allows GM to approve manager pending requests', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'general_manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'manager',
      now,
    });

    expect(update.status).toBe('gm_approved');
    expect(update.final_approved_at).toBeNull();
    expect(update.final_approved_by).toBeNull();
    expect(update.final_approved_by_role).toBeNull();
    expect(update.gm_approved_at).toBe(now);
    expect(update.hr_notified_at).toBeUndefined();
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
    expect(update.final_approved_at).toBeNull();
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

  it('uses configured workflow stages for standard approval path', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'general_manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      workflowStages: ['general_manager', 'director'],
      now,
    });

    expect(update.status).toBe('gm_approved');
    expect(update.gm_approved_by).toBe(approverId);
    expect(update.gm_approved_at).toBe(now);
    expect(update.final_approved_at).toBeNull();
    expect(update.hr_notified_at).toBeUndefined();
  });

  it('adapts a shared department workflow for manager requests', () => {
    expect(
      adaptDepartmentWorkflowStagesForRequesterRole('manager', ['manager', 'general_manager', 'director']),
    ).toEqual(['general_manager', 'director']);
  });

  it('adapts a shared department workflow for director/admin/hr requests', () => {
    expect(
      adaptDepartmentWorkflowStagesForRequesterRole('director', ['manager', 'general_manager', 'director']),
    ).toEqual(['director']);
    expect(
      adaptDepartmentWorkflowStagesForRequesterRole('admin', ['manager', 'general_manager', 'director']),
    ).toEqual(['director']);
    expect(
      adaptDepartmentWorkflowStagesForRequesterRole('hr', ['manager', 'general_manager', 'director']),
    ).toEqual(['director']);
  });

  it('marks GM as final approver when workflow ends at GM', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'general_manager',
      approverId,
      currentStatus: 'manager_approved',
      requesterRole: 'employee',
      workflowStages: ['manager', 'general_manager'],
      now,
    });

    expect(update.status).toBe('gm_approved');
    expect(update.final_approved_at).toBe(now);
    expect(update.final_approved_by).toBe(approverId);
    expect(update.final_approved_by_role).toBe('general_manager');
    expect(update.hr_notified_at).toBe(now);
  });

  it('notifies HR/Admin when director performs the final approval', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'director',
      approverId,
      currentStatus: 'gm_approved',
      requesterRole: 'employee',
      managerComments: 'Approved after executive review.',
      now,
    });

    expect(update.status).toBe('director_approved');
    expect(update.director_approved_by).toBe(approverId);
    expect(update.director_approved_at).toBe(now);
    expect(update.final_approved_at).toBe(now);
    expect(update.final_approved_by).toBe(approverId);
    expect(update.final_approved_by_role).toBe('director');
    expect(update.hr_notified_at).toBe(now);
    expect(update.manager_comments).toBe('Approved after executive review.');
  });

  it('blocks HR/Admin from approving leave requests', () => {
    expect(() =>
      buildLeaveApprovalUpdate({
        action: 'approve',
        approverRole: 'admin',
        approverId,
        currentStatus: 'gm_approved',
        requesterRole: 'employee',
        now,
      }),
    ).toThrow('current approval stage');
  });

  it('includes full pending statuses for balances and calendar visibility', () => {
    expect(BALANCE_PENDING_STATUSES).toEqual([
      'pending',
      'manager_approved',
      'gm_approved',
    ]);

    expect(CALENDAR_VISIBLE_LEAVE_STATUSES).toEqual([
      'manager_approved',
      'gm_approved',
      'director_approved',
      'hr_approved',
    ]);
  });

  it('processes cancellation approval using the configured route', () => {
    const update = buildLeaveCancellationApprovalUpdate({
      action: 'approve',
      approverRole: 'manager',
      approverId,
      requesterRole: 'employee',
      currentCancellationStatus: 'pending',
      workflowStages: ['manager', 'general_manager'],
      now,
    });

    expect(update.cancellation_status).toBe('manager_approved');
    expect(update.cancellation_manager_approved_by).toBe(approverId);
    expect(update.status).toBeUndefined();
    expect(update.cancelled_at).toBeUndefined();
  });

  it('marks leave cancelled when final cancellation approval is reached', () => {
    const update = buildLeaveCancellationApprovalUpdate({
      action: 'approve',
      approverRole: 'general_manager',
      approverId,
      requesterRole: 'employee',
      currentCancellationStatus: 'manager_approved',
      workflowStages: ['manager', 'general_manager'],
      now,
    });

    expect(update.cancellation_status).toBe('approved');
    expect(update.cancellation_final_approved_by).toBe(approverId);
    expect(update.cancelled_by).toBe(approverId);
    expect(update.cancelled_at).toBe(now);
    expect(update.status).toBe('cancelled');
  });
});
