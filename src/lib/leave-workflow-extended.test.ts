import { describe, expect, it } from 'vitest';
import {
  normalizeLeaveApprovalStages,
  isLeaveApprovalStage,
  resolveLeaveApprovalWorkflowStages,
  getDefaultLeaveApprovalWorkflowStages,
  getNextRequiredApprovalStage,
  canRoleApproveLeaveAtCurrentStage,
  getLeaveStatusDisplayLabel,
  getNextLeaveApprovalStageFromRouteSnapshot,
  buildLeaveApprovalUpdate,
  adaptDepartmentWorkflowStagesForRequesterRole,
  LEAVE_APPROVAL_STAGE_OPTIONS,
  LEAVE_APPROVAL_STAGE_LABELS,
  DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE,
} from '@/lib/leave-workflow';
import type { AppRole, LeaveApprovalStage, LeaveStatus } from '@/types/hrms';

const approverId = '00000000-0000-0000-0000-000000000001';
const now = '2026-02-20T00:00:00.000Z';

// ── isLeaveApprovalStage ─────────────────────────────────────────────────────
describe('isLeaveApprovalStage', () => {
  it.each(['manager', 'general_manager', 'director'] as const)(
    'returns true for valid stage "%s"',
    (stage) => {
      expect(isLeaveApprovalStage(stage)).toBe(true);
    },
  );

  it.each(['hr', 'admin', 'employee', 'ceo', '', 'Manager', 'DIRECTOR'])(
    'returns false for invalid value "%s"',
    (value) => {
      expect(isLeaveApprovalStage(value)).toBe(false);
    },
  );
});

// ── normalizeLeaveApprovalStages ─────────────────────────────────────────────
describe('normalizeLeaveApprovalStages', () => {
  it('returns empty array for null input', () => {
    expect(normalizeLeaveApprovalStages(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(normalizeLeaveApprovalStages(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(normalizeLeaveApprovalStages([])).toEqual([]);
  });

  it('filters out invalid stage strings', () => {
    expect(normalizeLeaveApprovalStages(['manager', 'invalid', 'director'])).toEqual([
      'manager',
      'director',
    ]);
  });

  it('removes duplicate stages', () => {
    expect(
      normalizeLeaveApprovalStages(['manager', 'manager', 'director', 'director']),
    ).toEqual(['manager', 'director']);
  });

  it('reorders stages to canonical order (manager → general_manager → director)', () => {
    expect(
      normalizeLeaveApprovalStages(['director', 'manager', 'general_manager']),
    ).toEqual(['manager', 'general_manager', 'director']);
  });

  it('handles single-stage arrays', () => {
    expect(normalizeLeaveApprovalStages(['director'])).toEqual(['director']);
  });

  it('returns empty when all values are invalid', () => {
    expect(normalizeLeaveApprovalStages(['hr', 'admin', 'employee'])).toEqual([]);
  });
});

// ── getDefaultLeaveApprovalWorkflowStages ────────────────────────────────────
describe('getDefaultLeaveApprovalWorkflowStages', () => {
  it('returns 3-stage route for employee', () => {
    expect(getDefaultLeaveApprovalWorkflowStages('employee')).toEqual([
      'manager',
      'general_manager',
      'director',
    ]);
  });

  it('returns 2-stage route for manager (skips self)', () => {
    expect(getDefaultLeaveApprovalWorkflowStages('manager')).toEqual([
      'general_manager',
      'director',
    ]);
  });

  it('returns director-only for director self-leave', () => {
    expect(getDefaultLeaveApprovalWorkflowStages('director')).toEqual(['director']);
  });

  it('returns director-only for hr role', () => {
    expect(getDefaultLeaveApprovalWorkflowStages('hr')).toEqual(['director']);
  });

  it('returns director-only for admin role', () => {
    expect(getDefaultLeaveApprovalWorkflowStages('admin')).toEqual(['director']);
  });

  it('returns a new array each time (not a shared reference)', () => {
    const a = getDefaultLeaveApprovalWorkflowStages('employee');
    const b = getDefaultLeaveApprovalWorkflowStages('employee');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

// ── adaptDepartmentWorkflowStagesForRequesterRole (extended) ─────────────────
describe('adaptDepartmentWorkflowStagesForRequesterRole (extended)', () => {
  it('preserves all stages for employee requester', () => {
    expect(
      adaptDepartmentWorkflowStagesForRequesterRole('employee', [
        'manager',
        'general_manager',
        'director',
      ]),
    ).toEqual(['manager', 'general_manager', 'director']);
  });

  it('filters manager stage for general_manager requester', () => {
    expect(
      adaptDepartmentWorkflowStagesForRequesterRole('general_manager', [
        'manager',
        'general_manager',
        'director',
      ]),
    ).toEqual(['general_manager', 'director']);
  });

  it('returns empty for empty workflow input', () => {
    expect(adaptDepartmentWorkflowStagesForRequesterRole('employee', [])).toEqual([]);
  });

  it('returns empty for null/undefined workflow input after normalization', () => {
    // The function normalizes first, so invalid inputs become empty
    expect(
      adaptDepartmentWorkflowStagesForRequesterRole('employee', ['invalid'] as unknown as LeaveApprovalStage[]),
    ).toEqual([]);
  });
});

// ── resolveLeaveApprovalWorkflowStages ───────────────────────────────────────
describe('resolveLeaveApprovalWorkflowStages', () => {
  it('uses provided workflow stages when valid', () => {
    expect(
      resolveLeaveApprovalWorkflowStages({
        requesterRole: 'employee',
        workflowStages: ['general_manager', 'director'],
      }),
    ).toEqual(['general_manager', 'director']);
  });

  it('falls back to defaults when workflow stages are empty', () => {
    expect(
      resolveLeaveApprovalWorkflowStages({
        requesterRole: 'employee',
        workflowStages: [],
      }),
    ).toEqual(['manager', 'general_manager', 'director']);
  });

  it('falls back to defaults when workflow stages are undefined', () => {
    expect(
      resolveLeaveApprovalWorkflowStages({
        requesterRole: 'manager',
      }),
    ).toEqual(['general_manager', 'director']);
  });

  it('adapts workflow for manager requester (filters out manager stage)', () => {
    expect(
      resolveLeaveApprovalWorkflowStages({
        requesterRole: 'manager',
        workflowStages: ['manager', 'general_manager', 'director'],
      }),
    ).toEqual(['general_manager', 'director']);
  });

  it('adapts workflow for director requester (keeps only director)', () => {
    expect(
      resolveLeaveApprovalWorkflowStages({
        requesterRole: 'director',
        workflowStages: ['manager', 'general_manager', 'director'],
      }),
    ).toEqual(['director']);
  });
});

// ── getNextRequiredApprovalStage ──────────────────────────────────────────────
describe('getNextRequiredApprovalStage', () => {
  it('returns first stage for pending status', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe('manager');
  });

  it('returns next stage after manager approval', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'manager_approved',
        requesterRole: 'employee',
      }),
    ).toBe('general_manager');
  });

  it('returns director after gm_approved', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'gm_approved',
        requesterRole: 'employee',
      }),
    ).toBe('director');
  });

  it('returns null after director_approved (terminal)', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'director_approved',
        requesterRole: 'employee',
      }),
    ).toBeNull();
  });

  it('returns null for rejected status', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'rejected',
        requesterRole: 'employee',
      }),
    ).toBeNull();
  });

  it('returns null for cancelled status', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'cancelled',
        requesterRole: 'employee',
      }),
    ).toBeNull();
  });

  it('returns null for hr_approved status', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'hr_approved',
        requesterRole: 'employee',
      }),
    ).toBeNull();
  });

  it('uses provided workflow stages instead of defaults', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'pending',
        requesterRole: 'employee',
        workflowStages: ['general_manager', 'director'],
      }),
    ).toBe('general_manager');
  });

  it('returns null when workflow ends at current stage (2-stage workflow, gm_approved)', () => {
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'gm_approved',
        requesterRole: 'employee',
        workflowStages: ['manager', 'general_manager'],
      }),
    ).toBeNull();
  });

  it('handles workflow config change mid-request gracefully (canonical order fallback)', () => {
    // Request was approved by manager (manager_approved), but workflow now only has [director]
    // Should find director since it's the next stage in canonical order
    expect(
      getNextRequiredApprovalStage({
        currentStatus: 'manager_approved',
        requesterRole: 'employee',
        workflowStages: ['director'],
      }),
    ).toBe('director');
  });
});

// ── canRoleApproveLeaveAtCurrentStage ────────────────────────────────────────
describe('canRoleApproveLeaveAtCurrentStage', () => {
  it('allows manager to approve pending employee request', () => {
    expect(
      canRoleApproveLeaveAtCurrentStage({
        approverRole: 'manager',
        currentStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe(true);
  });

  it('disallows GM from approving pending employee request (default workflow starts with manager)', () => {
    expect(
      canRoleApproveLeaveAtCurrentStage({
        approverRole: 'general_manager',
        currentStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe(false);
  });

  it('allows GM to approve manager_approved employee request', () => {
    expect(
      canRoleApproveLeaveAtCurrentStage({
        approverRole: 'general_manager',
        currentStatus: 'manager_approved',
        requesterRole: 'employee',
      }),
    ).toBe(true);
  });

  it('allows director to approve gm_approved request', () => {
    expect(
      canRoleApproveLeaveAtCurrentStage({
        approverRole: 'director',
        currentStatus: 'gm_approved',
        requesterRole: 'employee',
      }),
    ).toBe(true);
  });

  it('disallows employee role from approving anything', () => {
    expect(
      canRoleApproveLeaveAtCurrentStage({
        approverRole: 'employee',
        currentStatus: 'pending',
        requesterRole: 'employee',
      }),
    ).toBe(false);
  });

  it('disallows hr from approving (not in approval chain)', () => {
    expect(
      canRoleApproveLeaveAtCurrentStage({
        approverRole: 'hr',
        currentStatus: 'gm_approved',
        requesterRole: 'employee',
      }),
    ).toBe(false);
  });

  it('uses custom workflow stages', () => {
    // Workflow skips manager, starts at GM
    expect(
      canRoleApproveLeaveAtCurrentStage({
        approverRole: 'general_manager',
        currentStatus: 'pending',
        requesterRole: 'employee',
        workflowStages: ['general_manager', 'director'],
      }),
    ).toBe(true);
  });
});

// ── getLeaveStatusDisplayLabel ───────────────────────────────────────────────
describe('getLeaveStatusDisplayLabel', () => {
  it('returns "Rejected" for rejected status', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'rejected', requesterRole: 'employee' }),
    ).toBe('Rejected');
  });

  it('returns "Cancelled" for cancelled status', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'cancelled', requesterRole: 'employee' }),
    ).toBe('Cancelled');
  });

  it('returns "Approved" for director_approved status', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'director_approved', requesterRole: 'employee' }),
    ).toBe('Approved');
  });

  it('returns "Approved" for hr_approved status', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'hr_approved', requesterRole: 'employee' }),
    ).toBe('Approved');
  });

  it('returns "Pending Manager" for pending employee request (default workflow)', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'pending', requesterRole: 'employee' }),
    ).toBe('Pending Manager');
  });

  it('returns "Pending General Manager" for pending manager request', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'pending', requesterRole: 'manager' }),
    ).toBe('Pending General Manager');
  });

  it('returns "Awaiting General Manager" for manager_approved employee request', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'manager_approved', requesterRole: 'employee' }),
    ).toBe('Awaiting General Manager');
  });

  it('returns "Awaiting Director" for gm_approved employee request', () => {
    expect(
      getLeaveStatusDisplayLabel({ status: 'gm_approved', requesterRole: 'employee' }),
    ).toBe('Awaiting Director');
  });

  it('returns "Approved" when intermediate status has no next stage (end of workflow)', () => {
    // Workflow ends at manager. Current status is manager_approved → no next stage → "Approved"
    expect(
      getLeaveStatusDisplayLabel({
        status: 'manager_approved',
        requesterRole: 'employee',
        workflowStages: ['manager'],
      }),
    ).toBe('Approved');
  });

  it('uses custom workflow stages for display', () => {
    // Workflow: GM → Director; pending → Pending General Manager
    expect(
      getLeaveStatusDisplayLabel({
        status: 'pending',
        requesterRole: 'employee',
        workflowStages: ['general_manager', 'director'],
      }),
    ).toBe('Pending General Manager');
  });
});

// ── getNextLeaveApprovalStageFromRouteSnapshot (extended) ─────────────────────
describe('getNextLeaveApprovalStageFromRouteSnapshot (extended)', () => {
  it('returns null for rejected status', () => {
    expect(
      getNextLeaveApprovalStageFromRouteSnapshot({
        currentStatus: 'rejected',
        approvalRouteSnapshot: ['manager', 'director'],
      }),
    ).toBeNull();
  });

  it('returns null for cancelled status', () => {
    expect(
      getNextLeaveApprovalStageFromRouteSnapshot({
        currentStatus: 'cancelled',
        approvalRouteSnapshot: ['manager'],
      }),
    ).toBeNull();
  });

  it('returns null for director_approved status', () => {
    expect(
      getNextLeaveApprovalStageFromRouteSnapshot({
        currentStatus: 'director_approved',
        approvalRouteSnapshot: ['manager', 'director'],
      }),
    ).toBeNull();
  });

  it('returns null for hr_approved status', () => {
    expect(
      getNextLeaveApprovalStageFromRouteSnapshot({
        currentStatus: 'hr_approved',
      }),
    ).toBeNull();
  });

  it('returns null when at end of route snapshot', () => {
    expect(
      getNextLeaveApprovalStageFromRouteSnapshot({
        currentStatus: 'gm_approved',
        approvalRouteSnapshot: ['general_manager'],
      }),
    ).toBeNull();
  });

  it('falls back to canonical fallback when stage not in route', () => {
    // Request is at manager_approved but route has only [director]
    // canonical order: manager < general_manager < director, so next after manager is director
    expect(
      getNextLeaveApprovalStageFromRouteSnapshot({
        currentStatus: 'manager_approved',
        approvalRouteSnapshot: ['director'],
      }),
    ).toBe('director');
  });
});

// ── buildLeaveApprovalUpdate (extended) ──────────────────────────────────────
describe('buildLeaveApprovalUpdate (extended)', () => {
  it('rejects leave request with valid rejection reason', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'reject',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      rejectionReason: 'Insufficient staffing coverage.',
      now,
    });

    expect(update.status).toBe('rejected');
    expect(update.rejected_by).toBe(approverId);
    expect(update.rejected_at).toBe(now);
    expect(update.rejection_reason).toBe('Insufficient staffing coverage.');
    expect(update.document_required).toBe(false);
    expect(update.final_approved_at).toBeNull();
    expect(update.final_approved_by).toBeNull();
    expect(update.final_approved_by_role).toBeNull();
  });

  it('rejects leave request without reason (null fallback)', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'reject',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      now,
    });

    expect(update.status).toBe('rejected');
    expect(update.rejection_reason).toBeNull();
    expect(update.manager_comments).toBeNull();
  });

  it('blocks non-manager from requesting documents', () => {
    expect(() =>
      buildLeaveApprovalUpdate({
        action: 'request_document',
        approverRole: 'general_manager',
        approverId,
        currentStatus: 'pending',
        requesterRole: 'employee',
        now,
      }),
    ).toThrow('Only managers can request documents');
  });

  it('blocks document request on non-pending status', () => {
    expect(() =>
      buildLeaveApprovalUpdate({
        action: 'request_document',
        approverRole: 'manager',
        approverId,
        currentStatus: 'manager_approved',
        requesterRole: 'employee',
        now,
      }),
    ).toThrow('Only managers can request documents');
  });

  it('uses default comments when document request has no managerComments', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'request_document',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      now,
    });

    expect(update.document_required).toBe(true);
    expect(update.manager_comments).toBe('Please provide supporting documentation.');
  });

  it('clears manager_comments on manager approval without comments', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      now,
    });

    expect(update.manager_comments).toBeNull();
  });

  it('uses auto-generated timestamp when now is not provided', () => {
    const before = new Date().toISOString();
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
    });
    const after = new Date().toISOString();

    const ts = update.manager_approved_at as string;
    expect(ts >= before).toBe(true);
    expect(ts <= after).toBe(true);
  });

  it('clears document_required flag on approval', () => {
    const update = buildLeaveApprovalUpdate({
      action: 'approve',
      approverRole: 'manager',
      approverId,
      currentStatus: 'pending',
      requesterRole: 'employee',
      now,
    });
    expect(update.document_required).toBe(false);
  });

  it('rejects director-level approval when stage requires GM-level', () => {
    expect(() =>
      buildLeaveApprovalUpdate({
        action: 'approve',
        approverRole: 'director',
        approverId,
        currentStatus: 'pending',
        requesterRole: 'employee',
        now,
      }),
    ).toThrow('current approval stage');
  });
});

// ── Constants ────────────────────────────────────────────────────────────────
describe('leave workflow constants', () => {
  it('LEAVE_APPROVAL_STAGE_OPTIONS has exactly 3 canonical stages in order', () => {
    expect(LEAVE_APPROVAL_STAGE_OPTIONS).toEqual(['manager', 'general_manager', 'director']);
    expect(LEAVE_APPROVAL_STAGE_OPTIONS).toHaveLength(3);
  });

  it('LEAVE_APPROVAL_STAGE_LABELS maps every stage to a human label', () => {
    expect(LEAVE_APPROVAL_STAGE_LABELS.manager).toBe('Manager');
    expect(LEAVE_APPROVAL_STAGE_LABELS.general_manager).toBe('General Manager');
    expect(LEAVE_APPROVAL_STAGE_LABELS.director).toBe('Director');
  });

  it('DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE covers all 6 roles', () => {
    const roles: AppRole[] = ['admin', 'hr', 'manager', 'employee', 'general_manager', 'director'];
    roles.forEach((role) => {
      expect(DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE[role]).toBeDefined();
      expect(DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE[role].length).toBeGreaterThan(0);
    });
  });
});
