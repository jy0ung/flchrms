import { useCallback } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useLeaveDelegatedApprovalAccess } from '@/hooks/useLeaveDelegations';
import {
  canRequestLeaveSupportingDocument,
  canViewLeaveSupportingDocument,
  canViewTeamLeaveRequests as canViewTeamLeaveRequestsPermission,
} from '@/lib/permissions';
import {
  canRoleApproveLeaveCancellationAtCurrentStage,
  canRoleHandleLeaveApprovalStage,
  getNextLeaveApprovalStageFromRouteSnapshot,
  LEAVE_APPROVAL_STAGE_LABELS,
  normalizeLeaveCancellationApprovalStages,
} from '@/lib/leave-workflow';
import { isCancellationPending } from '@/lib/leave-utils';
import type { LeaveRequest, LeaveStatus } from '@/types/hrms';

import type {
  LeaveCapabilitiesResult,
  LeaveCancellationBadge,
  LeaveRequestStatusDisplay,
  LeaveRowActionPermissions,
  LeaveWorkspaceView,
} from '@/modules/leave/types';

const STATUS_CONFIG: Record<LeaveStatus, LeaveRequestStatusDisplay> = {
  pending: { status: 'pending', label: 'Pending' },
  manager_approved: { status: 'manager_approved', label: 'Awaiting Approval' },
  gm_approved: { status: 'gm_approved', label: 'Awaiting Approval' },
  director_approved: { status: 'approved', label: 'Approved' },
  hr_approved: { status: 'approved', label: 'Approved (Legacy)' },
  rejected: { status: 'rejected', label: 'Rejected' },
  cancelled: { status: 'cancelled', label: 'Cancelled' },
};

export function useLeaveCapabilities(): LeaveCapabilitiesResult {
  const { role, user } = useAuth();
  const { data: delegatedApprovalAccess } = useLeaveDelegatedApprovalAccess();

  const getStatusDisplay = useCallback((request: LeaveRequest): LeaveRequestStatusDisplay => {
    if (request.status === 'cancelled' || request.status === 'rejected') {
      return STATUS_CONFIG[request.status];
    }

    if (request.final_approved_at) {
      return STATUS_CONFIG.director_approved;
    }

    const nextApprovalStage = getNextLeaveApprovalStageFromRouteSnapshot({
      currentStatus: request.status,
      approvalRouteSnapshot: request.approval_route_snapshot,
    });

    if (nextApprovalStage) {
      const nextApprovalLabel = LEAVE_APPROVAL_STAGE_LABELS[nextApprovalStage];
      if (request.status === 'pending') {
        return { status: 'pending', label: `Pending ${nextApprovalLabel}` };
      }

      return { status: request.status, label: `Awaiting ${nextApprovalLabel}` };
    }

    return STATUS_CONFIG[request.status];
  }, []);

  const getCancellationNextStageLabel = useCallback((request: LeaveRequest) => {
    const route = (request.cancellation_route_snapshot || []).filter(
      (stage): stage is 'manager' | 'general_manager' | 'director' =>
        stage === 'manager' || stage === 'general_manager' || stage === 'director',
    );

    const labelMap = {
      manager: 'Manager',
      general_manager: 'GM',
      director: 'Director',
    } as const;

    if (request.cancellation_status === 'pending') {
      const nextStage = route[0];
      return nextStage ? labelMap[nextStage] : null;
    }

    const currentStageByStatus = {
      manager_approved: 'manager',
      gm_approved: 'general_manager',
      director_approved: 'director',
    } as const;

    if (
      request.cancellation_status === 'manager_approved' ||
      request.cancellation_status === 'gm_approved' ||
      request.cancellation_status === 'director_approved'
    ) {
      const currentStage = currentStageByStatus[request.cancellation_status];
      const currentIdx = route.indexOf(currentStage);
      const nextStage = currentIdx >= 0 ? route[currentIdx + 1] : null;
      return nextStage ? labelMap[nextStage] : null;
    }

    return null;
  }, []);

  const getCancellationBadge = useCallback((request: LeaveRequest): LeaveCancellationBadge => {
    if (!request.cancellation_status) return null;

    if (request.cancellation_status === 'rejected') {
      return {
        status: 'rejected',
        label: 'Cancellation Rejected',
      };
    }

    if (request.cancellation_status === 'approved') {
      return {
        status: 'cancelled',
        label: 'Cancellation Approved',
      };
    }

    if (isCancellationPending(request)) {
      const nextStage = getCancellationNextStageLabel(request);
      return {
        status: 'pending',
        label: nextStage ? `Cancellation Pending ${nextStage}` : 'Cancellation Pending',
      };
    }

    return null;
  }, [getCancellationNextStageLabel]);

  const canApprove = useCallback((request: LeaveRequest) => {
    if (isCancellationPending(request)) return false;
    if (request.final_approved_at || request.status === 'rejected' || request.status === 'cancelled') return false;

    const nextApprovalStage = getNextLeaveApprovalStageFromRouteSnapshot({
      currentStatus: request.status,
      approvalRouteSnapshot: request.approval_route_snapshot,
    });

    if (canRoleHandleLeaveApprovalStage(role, nextApprovalStage)) return true;

    if (!nextApprovalStage || !delegatedApprovalAccess?.hasAny) return false;

    if (nextApprovalStage === 'manager') return delegatedApprovalAccess.manager;
    if (nextApprovalStage === 'general_manager') return delegatedApprovalAccess.generalManager;
    return delegatedApprovalAccess.director;
  }, [delegatedApprovalAccess, role]);

  const isHistoricalRequest = useCallback((request: LeaveRequest) => (
    !isCancellationPending(request) && (!!request.final_approved_at || request.status === 'rejected' || request.status === 'cancelled')
  ), []);

  const canAmend = useCallback((request: LeaveRequest) => {
    return request.employee_id === user?.id && (
      request.status === 'rejected' || (request.status === 'pending' && request.document_required)
    );
  }, [user?.id]);

  const canCancelPending = useCallback((request: LeaveRequest) => (
    request.employee_id === user?.id &&
    request.status === 'pending' &&
    !request.document_required
  ), [user?.id]);

  const canRequestCancellation = useCallback((request: LeaveRequest) => (
    request.employee_id === user?.id &&
    !!request.final_approved_at &&
    request.status !== 'cancelled' &&
    !isCancellationPending(request)
  ), [user?.id]);

  const canApproveCancellation = useCallback((request: LeaveRequest) => {
    if (!role) return false;
    if (!isCancellationPending(request)) return false;
    if (request.status === 'cancelled' || !request.final_approved_at) return false;

    const workflowStages = normalizeLeaveCancellationApprovalStages(
      request.cancellation_route_snapshot ?? undefined,
    );

    const requesterRole = 'employee' as const;

    return canRoleApproveLeaveCancellationAtCurrentStage({
      approverRole: role,
      currentCancellationStatus: request.cancellation_status!,
      requesterRole,
      workflowStages: workflowStages.length > 0 ? workflowStages : undefined,
    });
  }, [role]);

  const canViewRequestAtCurrentApprovalStage = useCallback((request: LeaveRequest) => {
    if (!role) return false;

    if (role === 'hr' || role === 'admin') return true;
    if (isCancellationPending(request)) return true;
    if (isHistoricalRequest(request)) return true;

    const nextApprovalStage = getNextLeaveApprovalStageFromRouteSnapshot({
      currentStatus: request.status,
      approvalRouteSnapshot: request.approval_route_snapshot,
    });

    if (canRoleHandleLeaveApprovalStage(role, nextApprovalStage)) return true;

    if (!nextApprovalStage || !delegatedApprovalAccess?.hasAny) return false;
    if (nextApprovalStage === 'manager') return delegatedApprovalAccess.manager;
    if (nextApprovalStage === 'general_manager') return delegatedApprovalAccess.generalManager;
    return delegatedApprovalAccess.director;
  }, [delegatedApprovalAccess, isHistoricalRequest, role]);

  const getRowPermissions = useCallback((request: LeaveRequest): LeaveRowActionPermissions => {
    const approvalAccess = canApprove(request);
    return {
      canOpenDrawer: true,
      canApprove: approvalAccess,
      canReject: approvalAccess,
      canRequestDocument: approvalAccess && request.status === 'pending' && role === 'manager' && canRequestLeaveSupportingDocument(role),
      canAmend: canAmend(request),
      canCancelPending: canCancelPending(request),
      canRequestCancellation: canRequestCancellation(request),
      canApproveCancellation: canApproveCancellation(request),
      canViewDocument: Boolean(request.document_url) && canViewLeaveSupportingDocument(role),
    };
  }, [canAmend, canApprove, canApproveCancellation, canCancelPending, canRequestCancellation, role]);

  const pageActions = {
    canCreateRequest: Boolean(user?.id),
    canViewTeamRequests: canViewTeamLeaveRequestsPermission(role) || Boolean(delegatedApprovalAccess?.hasAny),
    canOpenTeamCalendarLink: canViewTeamLeaveRequestsPermission(role),
  };

  const defaultWorkspaceView = useCallback((input: {
    myRequestCount: number;
    teamRequestCount: number;
  }): LeaveWorkspaceView => {
    if (pageActions.canViewTeamRequests && input.myRequestCount === 0 && input.teamRequestCount > 0) {
      return 'TEAM_CURRENT';
    }
    return 'MY_CURRENT';
  }, [pageActions.canViewTeamRequests]);

  return {
    pageActions,
    delegatedApprovalAccess: delegatedApprovalAccess ?? null,
    defaultWorkspaceView,
    getStatusDisplay,
    getCancellationBadge,
    getRowPermissions,
    isHistoricalRequest,
    canViewRequestAtCurrentApprovalStage,
  };
}
