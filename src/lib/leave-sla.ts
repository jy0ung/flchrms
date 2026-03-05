import { LeaveApprovalStage, LeaveStatus } from '@/types/hrms';
import { getNextLeaveApprovalStageFromRouteSnapshot } from '@/lib/leave-workflow';

export interface LeaveSlaCandidateRequest {
  id: string;
  status: LeaveStatus;
  created_at: string;
  policy_version_id?: string | null;
  approval_route_snapshot?: LeaveApprovalStage[] | null;
}

export interface LeaveSlaDecisionEvent {
  leave_request_id: string;
  decided_at: string;
  to_status: string | null;
  to_cancellation_status?: string | null;
}

export interface LeaveSlaServiceLevel {
  policy_set_id: string;
  workflow_stage: LeaveApprovalStage;
  target_hours: number;
  escalation_to_stage?: LeaveApprovalStage | null;
}

export interface LeaveSlaEvaluation {
  stage: LeaveApprovalStage;
  stageEnteredAt: string;
  elapsedHours: number;
  targetHours: number | null;
  remainingHours: number | null;
  breached: boolean;
  atRisk: boolean;
  escalationToStage: LeaveApprovalStage | null;
  policySetId: string | null;
}

const SLA_PENDING_STATUSES: LeaveStatus[] = ['pending', 'manager_approved', 'gm_approved'];

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

export function canEvaluateLeaveSla(request: LeaveSlaCandidateRequest): boolean {
  if (!SLA_PENDING_STATUSES.includes(request.status)) return false;
  return Boolean(
    getNextLeaveApprovalStageFromRouteSnapshot({
      currentStatus: request.status,
      approvalRouteSnapshot: request.approval_route_snapshot ?? null,
    }),
  );
}

export function resolveLeaveSlaStage(request: LeaveSlaCandidateRequest): LeaveApprovalStage | null {
  if (!SLA_PENDING_STATUSES.includes(request.status)) return null;
  return getNextLeaveApprovalStageFromRouteSnapshot({
    currentStatus: request.status,
    approvalRouteSnapshot: request.approval_route_snapshot ?? null,
  });
}

export function resolveLeaveSlaStageEnteredAt(
  request: LeaveSlaCandidateRequest,
  decisions: LeaveSlaDecisionEvent[],
): string {
  const candidates = decisions
    .filter((decision) => decision.leave_request_id === request.id)
    .filter((decision) => decision.to_status === request.status)
    .filter((decision) => !decision.to_cancellation_status)
    .sort((a, b) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime());

  return candidates[0]?.decided_at ?? request.created_at;
}

export function evaluateLeaveRequestSla(
  request: LeaveSlaCandidateRequest,
  decisions: LeaveSlaDecisionEvent[],
  serviceLevels: LeaveSlaServiceLevel[],
  policySetByVersionId: Record<string, string>,
  now = new Date(),
): LeaveSlaEvaluation | null {
  const stage = resolveLeaveSlaStage(request);
  if (!stage) return null;

  const stageEnteredAt = resolveLeaveSlaStageEnteredAt(request, decisions);
  const elapsedHours = roundHours((now.getTime() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60));
  const policySetId = request.policy_version_id ? policySetByVersionId[request.policy_version_id] ?? null : null;

  const matchingLevel =
    serviceLevels.find(
      (level) => level.workflow_stage === stage && policySetId && level.policy_set_id === policySetId,
    ) ?? serviceLevels.find((level) => level.workflow_stage === stage) ?? null;

  if (!matchingLevel) {
    return {
      stage,
      stageEnteredAt,
      elapsedHours,
      targetHours: null,
      remainingHours: null,
      breached: false,
      atRisk: false,
      escalationToStage: null,
      policySetId,
    };
  }

  const targetHours = matchingLevel.target_hours;
  const remainingHours = roundHours(targetHours - elapsedHours);
  const breached = elapsedHours > targetHours;
  const atRisk = !breached && targetHours > 0 && elapsedHours >= targetHours * 0.8;

  return {
    stage,
    stageEnteredAt,
    elapsedHours,
    targetHours,
    remainingHours,
    breached,
    atRisk,
    escalationToStage: matchingLevel.escalation_to_stage ?? null,
    policySetId: matchingLevel.policy_set_id ?? policySetId,
  };
}
