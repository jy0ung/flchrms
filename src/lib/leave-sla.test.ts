import { describe, expect, it } from 'vitest';
import {
  canEvaluateLeaveSla,
  evaluateLeaveRequestSla,
  resolveLeaveSlaStage,
  resolveLeaveSlaStageEnteredAt,
} from '@/lib/leave-sla';
import type { LeaveSlaCandidateRequest, LeaveSlaDecisionEvent, LeaveSlaServiceLevel } from '@/lib/leave-sla';

const baseRequest: LeaveSlaCandidateRequest = {
  id: 'req-1',
  status: 'pending',
  created_at: '2026-03-01T00:00:00.000Z',
  policy_version_id: 'pv-1',
  approval_route_snapshot: ['manager', 'general_manager', 'director'],
};

describe('leave-sla', () => {
  it('returns next stage for pending request', () => {
    expect(resolveLeaveSlaStage(baseRequest)).toBe('manager');
    expect(canEvaluateLeaveSla(baseRequest)).toBe(true);
  });

  it('returns null stage for non-pending/final statuses', () => {
    const request: LeaveSlaCandidateRequest = {
      ...baseRequest,
      status: 'director_approved',
    };
    expect(resolveLeaveSlaStage(request)).toBeNull();
    expect(canEvaluateLeaveSla(request)).toBe(false);
  });

  it('uses latest decision timestamp matching current status', () => {
    const request: LeaveSlaCandidateRequest = {
      ...baseRequest,
      status: 'manager_approved',
      created_at: '2026-03-01T00:00:00.000Z',
    };

    const decisions: LeaveSlaDecisionEvent[] = [
      {
        leave_request_id: 'req-1',
        decided_at: '2026-03-01T04:00:00.000Z',
        to_status: 'pending',
      },
      {
        leave_request_id: 'req-1',
        decided_at: '2026-03-01T08:00:00.000Z',
        to_status: 'manager_approved',
      },
      {
        leave_request_id: 'req-1',
        decided_at: '2026-03-01T06:00:00.000Z',
        to_status: 'manager_approved',
      },
    ];

    expect(resolveLeaveSlaStageEnteredAt(request, decisions)).toBe('2026-03-01T08:00:00.000Z');
  });

  it('evaluates breached and at-risk states', () => {
    const request: LeaveSlaCandidateRequest = {
      ...baseRequest,
      created_at: '2026-03-01T00:00:00.000Z',
      status: 'pending',
    };
    const decisions: LeaveSlaDecisionEvent[] = [];
    const serviceLevels: LeaveSlaServiceLevel[] = [
      {
        policy_set_id: 'ps-1',
        workflow_stage: 'manager',
        target_hours: 24,
        escalation_to_stage: 'general_manager',
      },
    ];
    const policySetMap = { 'pv-1': 'ps-1' };

    const atRiskEvaluation = evaluateLeaveRequestSla(
      request,
      decisions,
      serviceLevels,
      policySetMap,
      new Date('2026-03-01T20:00:00.000Z'),
    );
    expect(atRiskEvaluation).not.toBeNull();
    expect(atRiskEvaluation!.targetHours).toBe(24);
    expect(atRiskEvaluation!.breached).toBe(false);
    expect(atRiskEvaluation!.atRisk).toBe(true);

    const breachedEvaluation = evaluateLeaveRequestSla(
      request,
      decisions,
      serviceLevels,
      policySetMap,
      new Date('2026-03-02T02:00:00.000Z'),
    );
    expect(breachedEvaluation).not.toBeNull();
    expect(breachedEvaluation!.breached).toBe(true);
    expect(breachedEvaluation!.atRisk).toBe(false);
    expect(breachedEvaluation!.remainingHours).toBeLessThan(0);
    expect(breachedEvaluation!.escalationToStage).toBe('general_manager');
  });

  it('returns null target data when no matching service level exists', () => {
    const evaluation = evaluateLeaveRequestSla(
      baseRequest,
      [],
      [],
      {},
      new Date('2026-03-01T03:00:00.000Z'),
    );

    expect(evaluation).not.toBeNull();
    expect(evaluation!.targetHours).toBeNull();
    expect(evaluation!.breached).toBe(false);
  });
});
