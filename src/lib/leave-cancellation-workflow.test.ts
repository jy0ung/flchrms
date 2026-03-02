import { describe, expect, it } from 'vitest';
import {
  normalizeLeaveCancellationApprovalStages,
  getDefaultLeaveCancellationWorkflowStages,
  resolveLeaveCancellationWorkflowStages,
  getNextRequiredCancellationApprovalStage,
  canRoleApproveLeaveCancellationAtCurrentStage,
  getLeaveCancellationStatusDisplayLabel,
  buildLeaveCancellationRequestUpdate,
  buildLeaveCancellationApprovalUpdate,
  DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE,
} from '@/lib/leave-workflow';
import type { AppRole, LeaveCancellationStatus } from '@/types/hrms';

const approverId = '00000000-0000-0000-0000-000000000001';
const requesterId = '00000000-0000-0000-0000-000000000002';
const now = '2026-02-20T00:00:00.000Z';

// ── normalizeLeaveCancellationApprovalStages ─────────────────────────────────
describe('normalizeLeaveCancellationApprovalStages', () => {
  it('delegates to normalizeLeaveApprovalStages (same behavior)', () => {
    expect(normalizeLeaveCancellationApprovalStages(null)).toEqual([]);
    expect(normalizeLeaveCancellationApprovalStages([])).toEqual([]);
    expect(
      normalizeLeaveCancellationApprovalStages(['director', 'manager']),
    ).toEqual(['manager', 'director']);
  });
});

// ── getDefaultLeaveCancellationWorkflowStages ────────────────────────────────
describe('getDefaultLeaveCancellationWorkflowStages', () => {
  it('returns 3-stage route for employee', () => {
    expect(getDefaultLeaveCancellationWorkflowStages('employee')).toEqual([
      'manager',
      'general_manager',
      'director',
    ]);
  });

  it('returns 2-stage route for manager', () => {
    expect(getDefaultLeaveCancellationWorkflowStages('manager')).toEqual([
      'general_manager',
      'director',
    ]);
  });

  it('returns director-only for director', () => {
    expect(getDefaultLeaveCancellationWorkflowStages('director')).toEqual(['director']);
  });

  it('returns independent array copies', () => {
    const a = getDefaultLeaveCancellationWorkflowStages('employee');
    const b = getDefaultLeaveCancellationWorkflowStages('employee');
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ── resolveLeaveCancellationWorkflowStages ───────────────────────────────────
describe('resolveLeaveCancellationWorkflowStages', () => {
  it('uses provided stages when valid', () => {
    expect(
      resolveLeaveCancellationWorkflowStages({
        requesterRole: 'employee',
        workflowStages: ['manager', 'director'],
      }),
    ).toEqual(['manager', 'director']);
  });

  it('falls back to defaults when stages are undefined', () => {
    expect(
      resolveLeaveCancellationWorkflowStages({ requesterRole: 'employee' }),
    ).toEqual(['manager', 'general_manager', 'director']);
  });

  it('adapts for manager requester', () => {
    expect(
      resolveLeaveCancellationWorkflowStages({
        requesterRole: 'manager',
        workflowStages: ['manager', 'general_manager', 'director'],
      }),
    ).toEqual(['general_manager', 'director']);
  });
});

// ── getNextRequiredCancellationApprovalStage ──────────────────────────────────
describe('getNextRequiredCancellationApprovalStage', () => {
  it('returns first stage for pending cancellation', () => {
    expect(
      getNextRequiredCancellationApprovalStage({
        currentCancellationStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe('manager');
  });

  it('returns next stage after manager_approved', () => {
    expect(
      getNextRequiredCancellationApprovalStage({
        currentCancellationStatus: 'manager_approved',
        requesterRole: 'employee',
      }),
    ).toBe('general_manager');
  });

  it('returns director after gm_approved', () => {
    expect(
      getNextRequiredCancellationApprovalStage({
        currentCancellationStatus: 'gm_approved',
        requesterRole: 'employee',
      }),
    ).toBe('director');
  });

  it('returns null for terminal approved status', () => {
    expect(
      getNextRequiredCancellationApprovalStage({
        currentCancellationStatus: 'approved',
        requesterRole: 'employee',
      }),
    ).toBeNull();
  });

  it('returns null for rejected cancellation', () => {
    expect(
      getNextRequiredCancellationApprovalStage({
        currentCancellationStatus: 'rejected',
        requesterRole: 'employee',
      }),
    ).toBeNull();
  });

  it('handles custom workflow', () => {
    expect(
      getNextRequiredCancellationApprovalStage({
        currentCancellationStatus: 'pending',
        requesterRole: 'employee',
        workflowStages: ['director'],
      }),
    ).toBe('director');
  });

  it('returns null when at the end of the workflow', () => {
    expect(
      getNextRequiredCancellationApprovalStage({
        currentCancellationStatus: 'manager_approved',
        requesterRole: 'employee',
        workflowStages: ['manager'],
      }),
    ).toBeNull();
  });
});

// ── canRoleApproveLeaveCancellationAtCurrentStage ────────────────────────────
describe('canRoleApproveLeaveCancellationAtCurrentStage', () => {
  it('allows manager to approve pending employee cancellation', () => {
    expect(
      canRoleApproveLeaveCancellationAtCurrentStage({
        approverRole: 'manager',
        currentCancellationStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe(true);
  });

  it('disallows GM from approving pending employee cancellation (default workflow)', () => {
    expect(
      canRoleApproveLeaveCancellationAtCurrentStage({
        approverRole: 'general_manager',
        currentCancellationStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe(false);
  });

  it('allows GM to approve manager_approved cancellation', () => {
    expect(
      canRoleApproveLeaveCancellationAtCurrentStage({
        approverRole: 'general_manager',
        currentCancellationStatus: 'manager_approved',
        requesterRole: 'employee',
      }),
    ).toBe(true);
  });

  it('disallows anyone from processing a terminal cancellation', () => {
    expect(
      canRoleApproveLeaveCancellationAtCurrentStage({
        approverRole: 'director',
        currentCancellationStatus: 'approved',
        requesterRole: 'employee',
      }),
    ).toBe(false);
  });
});

// ── getLeaveCancellationStatusDisplayLabel ────────────────────────────────────
describe('getLeaveCancellationStatusDisplayLabel', () => {
  it('returns "Cancellation Approved" for approved', () => {
    expect(
      getLeaveCancellationStatusDisplayLabel({
        cancellationStatus: 'approved',
        requesterRole: 'employee',
      }),
    ).toBe('Cancellation Approved');
  });

  it('returns "Cancellation Rejected" for rejected', () => {
    expect(
      getLeaveCancellationStatusDisplayLabel({
        cancellationStatus: 'rejected',
        requesterRole: 'employee',
      }),
    ).toBe('Cancellation Rejected');
  });

  it('returns "Cancellation Pending Manager" for pending employee', () => {
    expect(
      getLeaveCancellationStatusDisplayLabel({
        cancellationStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe('Cancellation Pending Manager');
  });

  it('returns "Cancellation Awaiting General Manager" for manager_approved', () => {
    expect(
      getLeaveCancellationStatusDisplayLabel({
        cancellationStatus: 'manager_approved',
        requesterRole: 'employee',
      }),
    ).toBe('Cancellation Awaiting General Manager');
  });

  it('returns "Cancellation Awaiting Director" for gm_approved', () => {
    expect(
      getLeaveCancellationStatusDisplayLabel({
        cancellationStatus: 'gm_approved',
        requesterRole: 'employee',
      }),
    ).toBe('Cancellation Awaiting Director');
  });

  it('returns "Cancellation Pending" when pending with no next stage (edge case)', () => {
    // director_approved is in-progress but no next stage after director
    expect(
      getLeaveCancellationStatusDisplayLabel({
        cancellationStatus: 'director_approved',
        requesterRole: 'employee',
      }),
    ).toBe('Cancellation Pending');
  });
});

// ── buildLeaveCancellationRequestUpdate ──────────────────────────────────────
describe('buildLeaveCancellationRequestUpdate', () => {
  it('initializes all cancellation fields correctly', () => {
    const update = buildLeaveCancellationRequestUpdate({
      requesterId,
      requesterRole: 'employee',
      reason: 'Changed plans',
      now,
    });

    expect(update.cancellation_status).toBe('pending');
    expect(update.cancellation_requested_at).toBe(now);
    expect(update.cancellation_requested_by).toBe(requesterId);
    expect(update.cancellation_reason).toBe('Changed plans');
    expect(update.cancellation_comments).toBeNull();

    // All approval fields should be null
    expect(update.cancellation_manager_approved_at).toBeNull();
    expect(update.cancellation_manager_approved_by).toBeNull();
    expect(update.cancellation_gm_approved_at).toBeNull();
    expect(update.cancellation_gm_approved_by).toBeNull();
    expect(update.cancellation_director_approved_at).toBeNull();
    expect(update.cancellation_director_approved_by).toBeNull();
    expect(update.cancellation_final_approved_at).toBeNull();
    expect(update.cancellation_final_approved_by).toBeNull();
    expect(update.cancellation_rejected_at).toBeNull();
    expect(update.cancellation_rejected_by).toBeNull();
    expect(update.cancellation_rejection_reason).toBeNull();
    expect(update.cancelled_at).toBeNull();
    expect(update.cancelled_by).toBeNull();
    expect(update.cancelled_by_role).toBeNull();
  });

  it('trims whitespace from reason', () => {
    const update = buildLeaveCancellationRequestUpdate({
      requesterId,
      requesterRole: 'employee',
      reason: '  spaced reason  ',
      now,
    });
    expect(update.cancellation_reason).toBe('spaced reason');
  });

  it('sets reason to null when empty/whitespace', () => {
    const update = buildLeaveCancellationRequestUpdate({
      requesterId,
      requesterRole: 'employee',
      reason: '   ',
      now,
    });
    expect(update.cancellation_reason).toBeNull();
  });

  it('stores cancellation_route_snapshot with resolved stages', () => {
    const update = buildLeaveCancellationRequestUpdate({
      requesterId,
      requesterRole: 'employee',
      now,
    });
    expect(update.cancellation_route_snapshot).toEqual([
      'manager',
      'general_manager',
      'director',
    ]);
  });

  it('stores adapted snapshot for manager requester', () => {
    const update = buildLeaveCancellationRequestUpdate({
      requesterId,
      requesterRole: 'manager',
      now,
    });
    expect(update.cancellation_route_snapshot).toEqual([
      'general_manager',
      'director',
    ]);
  });

  it('uses custom workflow stages', () => {
    const update = buildLeaveCancellationRequestUpdate({
      requesterId,
      requesterRole: 'employee',
      workflowStages: ['general_manager', 'director'],
      now,
    });
    expect(update.cancellation_route_snapshot).toEqual([
      'general_manager',
      'director',
    ]);
  });

  it('auto-generates timestamp when now is not provided', () => {
    const before = new Date().toISOString();
    const update = buildLeaveCancellationRequestUpdate({
      requesterId,
      requesterRole: 'employee',
    });
    const after = new Date().toISOString();

    const ts = update.cancellation_requested_at as string;
    expect(ts >= before).toBe(true);
    expect(ts <= after).toBe(true);
  });
});

// ── buildLeaveCancellationApprovalUpdate (extended) ──────────────────────────
describe('buildLeaveCancellationApprovalUpdate (extended)', () => {
  it('rejects cancellation with reason', () => {
    const update = buildLeaveCancellationApprovalUpdate({
      action: 'reject',
      approverRole: 'manager',
      approverId,
      requesterRole: 'employee',
      currentCancellationStatus: 'pending',
      rejectionReason: 'Cannot cancel mid-project.',
      comments: 'Discussed with team lead.',
      now,
    });

    expect(update.cancellation_status).toBe('rejected');
    expect(update.cancellation_rejected_at).toBe(now);
    expect(update.cancellation_rejected_by).toBe(approverId);
    expect(update.cancellation_rejection_reason).toBe('Cannot cancel mid-project.');
    expect(update.cancellation_comments).toBe('Discussed with team lead.');
  });

  it('rejects cancellation without reason (null fallback)', () => {
    const update = buildLeaveCancellationApprovalUpdate({
      action: 'reject',
      approverRole: 'manager',
      approverId,
      requesterRole: 'employee',
      currentCancellationStatus: 'pending',
      now,
    });

    expect(update.cancellation_rejection_reason).toBeNull();
    expect(update.cancellation_comments).toBeNull();
  });

  it('blocks unauthorized role from processing cancellation', () => {
    expect(() =>
      buildLeaveCancellationApprovalUpdate({
        action: 'approve',
        approverRole: 'employee',
        approverId,
        requesterRole: 'employee',
        currentCancellationStatus: 'pending',
        now,
      }),
    ).toThrow('current approval stage');
  });

  it('blocks out-of-order approval (manager tries to approve when GM is needed)', () => {
    expect(() =>
      buildLeaveCancellationApprovalUpdate({
        action: 'approve',
        approverRole: 'manager',
        approverId,
        requesterRole: 'employee',
        currentCancellationStatus: 'manager_approved',
        now,
      }),
    ).toThrow('current approval stage');
  });

  it('processes director final approval with full cancellation fields', () => {
    const update = buildLeaveCancellationApprovalUpdate({
      action: 'approve',
      approverRole: 'director',
      approverId,
      requesterRole: 'employee',
      currentCancellationStatus: 'gm_approved',
      comments: 'Final approval given.',
      now,
    });

    expect(update.cancellation_status).toBe('approved');
    expect(update.cancellation_director_approved_by).toBe(approverId);
    expect(update.cancellation_director_approved_at).toBe(now);
    expect(update.cancellation_final_approved_at).toBe(now);
    expect(update.cancellation_final_approved_by).toBe(approverId);
    expect(update.cancellation_final_approved_by_role).toBe('director');
    expect(update.status).toBe('cancelled');
    expect(update.cancelled_at).toBe(now);
    expect(update.cancelled_by).toBe(approverId);
    expect(update.cancelled_by_role).toBe('director');
    expect(update.cancellation_comments).toBe('Final approval given.');
  });

  it('processes intermediate GM approval without setting final/cancelled fields', () => {
    const update = buildLeaveCancellationApprovalUpdate({
      action: 'approve',
      approverRole: 'general_manager',
      approverId,
      requesterRole: 'employee',
      currentCancellationStatus: 'manager_approved',
      now,
    });

    expect(update.cancellation_status).toBe('gm_approved');
    expect(update.cancellation_gm_approved_by).toBe(approverId);
    expect(update.cancellation_gm_approved_at).toBe(now);
    // Should NOT have final/cancelled fields
    expect(update.cancellation_final_approved_at).toBeUndefined();
    expect(update.status).toBeUndefined();
    expect(update.cancelled_at).toBeUndefined();
  });

  it('handles 2-stage workflow where GM is final approver', () => {
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
    expect(update.status).toBe('cancelled');
    expect(update.cancelled_by).toBe(approverId);
    expect(update.cancellation_final_approved_by_role).toBe('general_manager');
  });
});

// ── Constants ────────────────────────────────────────────────────────────────
describe('cancellation workflow constants', () => {
  it('mirrors approval workflow defaults structure', () => {
    const roles: AppRole[] = ['admin', 'hr', 'manager', 'employee', 'general_manager', 'director'];
    roles.forEach((role) => {
      expect(DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE[role]).toBeDefined();
      expect(DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE[role].length).toBeGreaterThan(0);
    });
  });
});
