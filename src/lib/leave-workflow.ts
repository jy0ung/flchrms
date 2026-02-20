import { AppRole, LeaveStatus } from '@/types/hrms';

export type LeaveApprovalAction = 'approve' | 'reject' | 'request_document';

export const BALANCE_PENDING_STATUSES: LeaveStatus[] = [
  'pending',
  'manager_approved',
  'gm_approved',
  'director_approved',
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
}

function canManagePendingAsGeneralManager(requesterRole: AppRole) {
  return requesterRole === 'manager' || requesterRole === 'general_manager';
}

function canTakeWorkflowAction({
  approverRole,
  currentStatus,
  requesterRole,
}: Pick<BuildLeaveApprovalUpdateInput, 'approverRole' | 'currentStatus' | 'requesterRole'>) {
  if (approverRole === 'manager') {
    return currentStatus === 'pending';
  }

  if (approverRole === 'general_manager') {
    return (
      currentStatus === 'manager_approved' ||
      (currentStatus === 'pending' && canManagePendingAsGeneralManager(requesterRole))
    );
  }

  if (approverRole === 'director') {
    return currentStatus === 'gm_approved';
  }

  if (approverRole === 'hr' || approverRole === 'admin') {
    return ['pending', 'manager_approved', 'gm_approved', 'director_approved'].includes(currentStatus);
  }

  return false;
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

  if (!canTakeWorkflowAction({ approverRole, currentStatus, requesterRole })) {
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
    };
  }

  if (approverRole === 'manager') {
    return {
      status: 'manager_approved' as LeaveStatus,
      manager_approved_by: approverId,
      manager_approved_at: timestamp,
      manager_comments: managerComments || null,
    };
  }

  if (approverRole === 'general_manager') {
    const updateData: Record<string, unknown> = {
      status: 'gm_approved' as LeaveStatus,
      gm_approved_by: approverId,
      gm_approved_at: timestamp,
    };

    // GM self-leave (submitted by a GM) must continue through Director before HR.
    if (!(currentStatus === 'pending' && requesterRole === 'general_manager')) {
      updateData.hr_notified_at = timestamp;
    }

    return updateData;
  }

  if (approverRole === 'director') {
    return {
      status: 'director_approved' as LeaveStatus,
      director_approved_by: approverId,
      director_approved_at: timestamp,
      hr_notified_at: timestamp,
    };
  }

  return {
    status: 'hr_approved' as LeaveStatus,
    hr_approved_by: approverId,
    hr_approved_at: timestamp,
  };
}
