import { AppRole, LeaveApprovalStage, LeaveCancellationStatus, LeaveStatus } from '@/types/hrms';

export type LeaveApprovalAction = 'approve' | 'reject' | 'request_document';
export type LeaveCancellationAction = 'approve' | 'reject';
export type LeaveApprovalWorkflowConfigLike = {
  requester_role: AppRole;
  approval_stages: string[] | null;
  is_active?: boolean | null;
};
export type LeaveCancellationWorkflowConfigLike = LeaveApprovalWorkflowConfigLike;

export const BALANCE_PENDING_STATUSES: LeaveStatus[] = [
  'pending',
  'manager_approved',
  'gm_approved',
];

export const CALENDAR_VISIBLE_LEAVE_STATUSES: LeaveStatus[] = [
  'manager_approved',
  'gm_approved',
  'director_approved',
  'hr_approved',
];

interface BuildLeaveApprovalUpdateInput {
  action: LeaveApprovalAction;
  approverRole: AppRole;
  approverId: string;
  currentStatus: LeaveStatus;
  requesterRole: AppRole;
  rejectionReason?: string;
  managerComments?: string;
  now?: string;
  workflowStages?: LeaveApprovalStage[];
}

export const LEAVE_APPROVAL_STAGE_OPTIONS: LeaveApprovalStage[] = [
  'manager',
  'general_manager',
  'director',
];

export const LEAVE_APPROVAL_STAGE_LABELS: Record<LeaveApprovalStage, string> = {
  manager: 'Manager',
  general_manager: 'General Manager',
  director: 'Director',
};

const LEAVE_APPROVAL_STAGE_TO_STATUS: Record<LeaveApprovalStage, LeaveStatus> = {
  manager: 'manager_approved',
  general_manager: 'gm_approved',
  director: 'director_approved',
};

const LEAVE_APPROVAL_STAGE_TO_ROLE: Record<LeaveApprovalStage, AppRole> = {
  manager: 'manager',
  general_manager: 'general_manager',
  director: 'director',
};

const LEAVE_STATUS_TO_APPROVAL_STAGE: Partial<Record<LeaveStatus, LeaveApprovalStage>> = {
  manager_approved: 'manager',
  gm_approved: 'general_manager',
  director_approved: 'director',
};

export const DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE: Record<AppRole, LeaveApprovalStage[]> = {
  employee: ['manager', 'general_manager', 'director'],
  manager: ['general_manager', 'director'],
  general_manager: ['general_manager', 'director'],
  director: ['director'],
  hr: ['director'],
  admin: ['director'],
};

export const DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE: Record<AppRole, LeaveApprovalStage[]> = {
  employee: ['manager', 'general_manager', 'director'],
  manager: ['general_manager', 'director'],
  general_manager: ['general_manager', 'director'],
  director: ['director'],
  hr: ['director'],
  admin: ['director'],
};

export function adaptDepartmentWorkflowStagesForRequesterRole(
  requesterRole: AppRole,
  workflowStages: LeaveApprovalStage[],
): LeaveApprovalStage[] {
  const normalized = normalizeLeaveApprovalStages(workflowStages);
  if (normalized.length === 0) return [];

  // Department workflows are configured as a shared route. Trim stages that would
  // otherwise make the requester their own approver.
  if (requesterRole === 'manager' || requesterRole === 'general_manager') {
    return normalized.filter((stage) => stage !== 'manager');
  }

  if (requesterRole === 'director' || requesterRole === 'hr' || requesterRole === 'admin') {
    return normalized.filter((stage) => stage === 'director');
  }

  return normalized;
}

function canManagePendingAsGeneralManager(requesterRole: AppRole) {
  return requesterRole === 'manager' || requesterRole === 'general_manager';
}

export function isLeaveApprovalStage(value: string): value is LeaveApprovalStage {
  return LEAVE_APPROVAL_STAGE_OPTIONS.includes(value as LeaveApprovalStage);
}

export function normalizeLeaveApprovalStages(stages: string[] | null | undefined): LeaveApprovalStage[] {
  if (!stages?.length) return [];

  const seen = new Set<LeaveApprovalStage>();
  const normalized: LeaveApprovalStage[] = [];

  stages.forEach((stage) => {
    if (!isLeaveApprovalStage(stage)) return;
    if (seen.has(stage)) return;
    seen.add(stage);
    normalized.push(stage);
  });

  return LEAVE_APPROVAL_STAGE_OPTIONS.filter((stage) => normalized.includes(stage));
}

export function getDefaultLeaveApprovalWorkflowStages(requesterRole: AppRole): LeaveApprovalStage[] {
  return [...DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]];
}

export function resolveLeaveApprovalWorkflowStages({
  requesterRole,
  workflowStages,
}: {
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}): LeaveApprovalStage[] {
  const normalized = adaptDepartmentWorkflowStagesForRequesterRole(
    requesterRole,
    normalizeLeaveApprovalStages(workflowStages),
  );

  if (normalized.length > 0) {
    return normalized;
  }

  return getDefaultLeaveApprovalWorkflowStages(requesterRole);
}

function getCurrentApprovalStageFromStatus(status: LeaveStatus): LeaveApprovalStage | null {
  return LEAVE_STATUS_TO_APPROVAL_STAGE[status] ?? null;
}

function canApproverRoleHandleStage(approverRole: AppRole, stage: LeaveApprovalStage) {
  if (stage === 'manager') return approverRole === 'manager';
  if (stage === 'general_manager') return approverRole === 'general_manager';
  return approverRole === 'director';
}

export function getNextRequiredApprovalStage({
  currentStatus,
  requesterRole,
  workflowStages,
}: {
  currentStatus: LeaveStatus;
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}): LeaveApprovalStage | null {
  if (
    currentStatus === 'rejected' ||
    currentStatus === 'cancelled' ||
    currentStatus === 'director_approved' ||
    currentStatus === 'hr_approved'
  ) {
    return null;
  }

  const route = resolveLeaveApprovalWorkflowStages({ requesterRole, workflowStages });
  if (route.length === 0) return null;

  if (currentStatus === 'pending') {
    return route[0] ?? null;
  }

  const currentStage = getCurrentApprovalStageFromStatus(currentStatus);
  if (!currentStage) return null;

  const routeIndex = route.indexOf(currentStage);
  if (routeIndex >= 0) {
    return route[routeIndex + 1] ?? null;
  }

  // If workflow config changed after a request progressed, continue with the next
  // later stage in the canonical order to avoid blocking the request.
  const currentOrderIndex = LEAVE_APPROVAL_STAGE_OPTIONS.indexOf(currentStage);
  return route.find((stage) => LEAVE_APPROVAL_STAGE_OPTIONS.indexOf(stage) > currentOrderIndex) ?? null;
}

export function canRoleApproveLeaveAtCurrentStage({
  approverRole,
  currentStatus,
  requesterRole,
  workflowStages,
}: {
  approverRole: AppRole;
  currentStatus: LeaveStatus;
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}) {
  const nextStage = getNextRequiredApprovalStage({ currentStatus, requesterRole, workflowStages });
  if (!nextStage) return false;
  return canApproverRoleHandleStage(approverRole, nextStage);
}

export function getLeaveStatusDisplayLabel({
  status,
  requesterRole,
  workflowStages,
}: {
  status: LeaveStatus;
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}) {
  if (status === 'rejected') return 'Rejected';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'director_approved') return 'Approved';
  if (status === 'hr_approved') return 'Approved';

  const nextStage = getNextRequiredApprovalStage({ currentStatus: status, requesterRole, workflowStages });

  if (status === 'pending') {
    return nextStage ? `Pending ${LEAVE_APPROVAL_STAGE_LABELS[nextStage]}` : 'Pending';
  }

  return nextStage ? `Awaiting ${LEAVE_APPROVAL_STAGE_LABELS[nextStage]}` : 'Approved';
}

function buildApprovalUpdateForStage({
  approvalStage,
  approverId,
  timestamp,
  managerComments,
  notifyHr = false,
  isFinalApproval = false,
}: {
  approvalStage: LeaveApprovalStage;
  approverId: string;
  timestamp: string;
  managerComments?: string;
  notifyHr?: boolean;
  isFinalApproval?: boolean;
}): Record<string, unknown> {
  const update: Record<string, unknown> = {
    status: LEAVE_APPROVAL_STAGE_TO_STATUS[approvalStage],
    document_required: false,
    final_approved_at: isFinalApproval ? timestamp : null,
    final_approved_by: isFinalApproval ? approverId : null,
    final_approved_by_role: isFinalApproval ? LEAVE_APPROVAL_STAGE_TO_ROLE[approvalStage] : null,
  };

  if (managerComments) {
    update.manager_comments = managerComments;
  } else if (approvalStage === 'manager') {
    update.manager_comments = null;
  }

  if (approvalStage === 'manager') {
    update.manager_approved_by = approverId;
    update.manager_approved_at = timestamp;
    if (notifyHr) {
      update.hr_notified_at = timestamp;
    }
    return update;
  }

  if (approvalStage === 'general_manager') {
    update.gm_approved_by = approverId;
    update.gm_approved_at = timestamp;
    if (notifyHr) {
      update.hr_notified_at = timestamp;
    }
    return update;
  }

  if (approvalStage === 'director') {
    update.director_approved_by = approverId;
    update.director_approved_at = timestamp;
    if (notifyHr) {
      update.hr_notified_at = timestamp;
    }
    return update;
  }

  throw new Error('Unsupported leave approval stage.');
}

function canTakeWorkflowAction({
  approverRole,
  currentStatus,
  requesterRole,
  workflowStages,
}: Pick<BuildLeaveApprovalUpdateInput, 'approverRole' | 'currentStatus' | 'requesterRole' | 'workflowStages'>) {
  // Preserve legacy special-case allowance if no workflow config is supplied and the
  // requester is a GM. This matches existing behavior and seeded defaults.
  const effectiveStages =
    workflowStages ??
    (requesterRole === 'general_manager' && canManagePendingAsGeneralManager(requesterRole)
      ? DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE.general_manager
      : undefined);

  return canRoleApproveLeaveAtCurrentStage({
    approverRole,
    currentStatus,
    requesterRole,
    workflowStages: effectiveStages,
  });
}

export function buildLeaveApprovalUpdate({
  action,
  approverRole,
  approverId,
  currentStatus,
  requesterRole,
  rejectionReason,
  managerComments,
  now,
  workflowStages,
}: BuildLeaveApprovalUpdateInput): Record<string, unknown> {
  const timestamp = now ?? new Date().toISOString();

  if (action === 'request_document') {
    if (approverRole !== 'manager' || currentStatus !== 'pending') {
      throw new Error('Only managers can request documents for pending leave requests.');
    }

    return {
      document_required: true,
      manager_comments: managerComments || 'Please provide supporting documentation.',
    };
  }

  if (!canTakeWorkflowAction({ approverRole, currentStatus, requesterRole, workflowStages })) {
    throw new Error('You cannot process this leave request at the current approval stage.');
  }

  if (action === 'reject') {
    return {
      status: 'rejected' as LeaveStatus,
      rejected_by: approverId,
      rejected_at: timestamp,
      rejection_reason: rejectionReason || null,
      document_required: false,
      manager_comments: managerComments || null,
      final_approved_at: null,
      final_approved_by: null,
      final_approved_by_role: null,
    };
  }

  const approvalStage = getNextRequiredApprovalStage({
    currentStatus,
    requesterRole,
    workflowStages,
  });

  if (!approvalStage || !canApproverRoleHandleStage(approverRole, approvalStage)) {
    throw new Error('You cannot process this leave request at the current approval stage.');
  }

  const effectiveRoute = resolveLeaveApprovalWorkflowStages({ requesterRole, workflowStages });
  const currentStageIndex = effectiveRoute.indexOf(approvalStage);
  const remainingStages = currentStageIndex >= 0 ? effectiveRoute.slice(currentStageIndex + 1) : [];
  const isFinalApproval = remainingStages.length === 0;
  const notifyHr = isFinalApproval;

  return buildApprovalUpdateForStage({
    approvalStage,
    approverId,
    timestamp,
    managerComments,
    notifyHr,
    isFinalApproval,
  });
}

const LEAVE_CANCELLATION_STAGE_TO_STATUS: Record<LeaveApprovalStage, LeaveCancellationStatus> = {
  manager: 'manager_approved',
  general_manager: 'gm_approved',
  director: 'director_approved',
};

const LEAVE_CANCELLATION_STATUS_TO_STAGE: Partial<Record<LeaveCancellationStatus, LeaveApprovalStage>> = {
  manager_approved: 'manager',
  gm_approved: 'general_manager',
  director_approved: 'director',
};

interface BuildLeaveCancellationRequestUpdateInput {
  requesterId: string;
  requesterRole: AppRole;
  reason?: string;
  now?: string;
  workflowStages?: LeaveApprovalStage[];
}

interface BuildLeaveCancellationApprovalUpdateInput {
  action: LeaveCancellationAction;
  approverRole: AppRole;
  approverId: string;
  requesterRole: AppRole;
  currentCancellationStatus: LeaveCancellationStatus;
  rejectionReason?: string;
  comments?: string;
  now?: string;
  workflowStages?: LeaveApprovalStage[];
}

export function normalizeLeaveCancellationApprovalStages(stages: string[] | null | undefined): LeaveApprovalStage[] {
  return normalizeLeaveApprovalStages(stages);
}

export function getDefaultLeaveCancellationWorkflowStages(requesterRole: AppRole): LeaveApprovalStage[] {
  return [...DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]];
}

export function resolveLeaveCancellationWorkflowStages({
  requesterRole,
  workflowStages,
}: {
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}): LeaveApprovalStage[] {
  const normalized = adaptDepartmentWorkflowStagesForRequesterRole(
    requesterRole,
    normalizeLeaveCancellationApprovalStages(workflowStages),
  );
  if (normalized.length > 0) return normalized;
  return getDefaultLeaveCancellationWorkflowStages(requesterRole);
}

function getCurrentCancellationApprovalStageFromStatus(status: LeaveCancellationStatus): LeaveApprovalStage | null {
  return LEAVE_CANCELLATION_STATUS_TO_STAGE[status] ?? null;
}

export function getNextRequiredCancellationApprovalStage({
  currentCancellationStatus,
  requesterRole,
  workflowStages,
}: {
  currentCancellationStatus: LeaveCancellationStatus;
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}): LeaveApprovalStage | null {
  if (currentCancellationStatus === 'approved' || currentCancellationStatus === 'rejected') {
    return null;
  }

  const route = resolveLeaveCancellationWorkflowStages({ requesterRole, workflowStages });
  if (route.length === 0) return null;

  if (currentCancellationStatus === 'pending') {
    return route[0] ?? null;
  }

  const currentStage = getCurrentCancellationApprovalStageFromStatus(currentCancellationStatus);
  if (!currentStage) return null;

  const routeIndex = route.indexOf(currentStage);
  if (routeIndex >= 0) {
    return route[routeIndex + 1] ?? null;
  }

  const currentOrderIndex = LEAVE_APPROVAL_STAGE_OPTIONS.indexOf(currentStage);
  return route.find((stage) => LEAVE_APPROVAL_STAGE_OPTIONS.indexOf(stage) > currentOrderIndex) ?? null;
}

export function canRoleApproveLeaveCancellationAtCurrentStage({
  approverRole,
  currentCancellationStatus,
  requesterRole,
  workflowStages,
}: {
  approverRole: AppRole;
  currentCancellationStatus: LeaveCancellationStatus;
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}) {
  const nextStage = getNextRequiredCancellationApprovalStage({
    currentCancellationStatus,
    requesterRole,
    workflowStages,
  });
  if (!nextStage) return false;
  return canApproverRoleHandleStage(approverRole, nextStage);
}

export function getLeaveCancellationStatusDisplayLabel({
  cancellationStatus,
  requesterRole,
  workflowStages,
}: {
  cancellationStatus: LeaveCancellationStatus;
  requesterRole: AppRole;
  workflowStages?: LeaveApprovalStage[];
}) {
  if (cancellationStatus === 'approved') return 'Cancellation Approved';
  if (cancellationStatus === 'rejected') return 'Cancellation Rejected';

  const nextStage = getNextRequiredCancellationApprovalStage({
    currentCancellationStatus: cancellationStatus,
    requesterRole,
    workflowStages,
  });

  if (cancellationStatus === 'pending') {
    return nextStage ? `Cancellation Pending ${LEAVE_APPROVAL_STAGE_LABELS[nextStage]}` : 'Cancellation Pending';
  }

  return nextStage ? `Cancellation Awaiting ${LEAVE_APPROVAL_STAGE_LABELS[nextStage]}` : 'Cancellation Pending';
}

export function buildLeaveCancellationRequestUpdate({
  requesterId,
  requesterRole,
  reason,
  now,
  workflowStages,
}: BuildLeaveCancellationRequestUpdateInput): Record<string, unknown> {
  const timestamp = now ?? new Date().toISOString();
  const effectiveRoute = resolveLeaveCancellationWorkflowStages({ requesterRole, workflowStages });

  if (effectiveRoute.length === 0) {
    throw new Error('Cancellation workflow must contain at least one approval stage.');
  }

  return {
    cancellation_status: 'pending' as LeaveCancellationStatus,
    cancellation_route_snapshot: effectiveRoute,
    cancellation_requested_at: timestamp,
    cancellation_requested_by: requesterId,
    cancellation_reason: reason?.trim() || null,
    cancellation_comments: null,
    cancellation_manager_approved_at: null,
    cancellation_manager_approved_by: null,
    cancellation_gm_approved_at: null,
    cancellation_gm_approved_by: null,
    cancellation_director_approved_at: null,
    cancellation_director_approved_by: null,
    cancellation_final_approved_at: null,
    cancellation_final_approved_by: null,
    cancellation_final_approved_by_role: null,
    cancellation_rejected_at: null,
    cancellation_rejected_by: null,
    cancellation_rejection_reason: null,
    cancelled_at: null,
    cancelled_by: null,
    cancelled_by_role: null,
  };
}

function buildCancellationApprovalUpdateForStage({
  approvalStage,
  approverId,
  timestamp,
  comments,
  isFinalApproval = false,
}: {
  approvalStage: LeaveApprovalStage;
  approverId: string;
  timestamp: string;
  comments?: string;
  isFinalApproval?: boolean;
}): Record<string, unknown> {
  const update: Record<string, unknown> = {
    cancellation_status: isFinalApproval ? ('approved' as LeaveCancellationStatus) : LEAVE_CANCELLATION_STAGE_TO_STATUS[approvalStage],
    cancellation_comments: comments || null,
  };

  if (approvalStage === 'manager') {
    update.cancellation_manager_approved_by = approverId;
    update.cancellation_manager_approved_at = timestamp;
  } else if (approvalStage === 'general_manager') {
    update.cancellation_gm_approved_by = approverId;
    update.cancellation_gm_approved_at = timestamp;
  } else if (approvalStage === 'director') {
    update.cancellation_director_approved_by = approverId;
    update.cancellation_director_approved_at = timestamp;
  }

  if (isFinalApproval) {
    update.cancellation_final_approved_at = timestamp;
    update.cancellation_final_approved_by = approverId;
    update.cancellation_final_approved_by_role = LEAVE_APPROVAL_STAGE_TO_ROLE[approvalStage];
    update.status = 'cancelled' as LeaveStatus;
    update.cancelled_at = timestamp;
    update.cancelled_by = approverId;
    update.cancelled_by_role = LEAVE_APPROVAL_STAGE_TO_ROLE[approvalStage];
  }

  return update;
}

export function buildLeaveCancellationApprovalUpdate({
  action,
  approverRole,
  approverId,
  requesterRole,
  currentCancellationStatus,
  rejectionReason,
  comments,
  now,
  workflowStages,
}: BuildLeaveCancellationApprovalUpdateInput): Record<string, unknown> {
  const timestamp = now ?? new Date().toISOString();

  if (
    !canRoleApproveLeaveCancellationAtCurrentStage({
      approverRole,
      currentCancellationStatus,
      requesterRole,
      workflowStages,
    })
  ) {
    throw new Error('You cannot process this cancellation request at the current approval stage.');
  }

  if (action === 'reject') {
    return {
      cancellation_status: 'rejected' as LeaveCancellationStatus,
      cancellation_comments: comments || null,
      cancellation_rejected_at: timestamp,
      cancellation_rejected_by: approverId,
      cancellation_rejection_reason: rejectionReason?.trim() || null,
    };
  }

  const approvalStage = getNextRequiredCancellationApprovalStage({
    currentCancellationStatus,
    requesterRole,
    workflowStages,
  });

  if (!approvalStage || !canApproverRoleHandleStage(approverRole, approvalStage)) {
    throw new Error('You cannot process this cancellation request at the current approval stage.');
  }

  const effectiveRoute = resolveLeaveCancellationWorkflowStages({ requesterRole, workflowStages });
  const currentStageIndex = effectiveRoute.indexOf(approvalStage);
  const remainingStages = currentStageIndex >= 0 ? effectiveRoute.slice(currentStageIndex + 1) : [];

  return buildCancellationApprovalUpdateForStage({
    approvalStage,
    approverId,
    timestamp,
    comments,
    isFinalApproval: remainingStages.length === 0,
  });
}
