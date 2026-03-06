import type { LeaveRequest } from '@/types/hrms';

export type LeaveDrawerTab =
  | 'request'
  | 'balance'
  | 'approval'
  | 'cancellation'
  | 'documents';

export type LeaveWorkspaceView =
  | 'MY_CURRENT'
  | 'MY_HISTORY'
  | 'TEAM_CURRENT'
  | 'TEAM_HISTORY';

export interface LeavePageProps {
  initialView?: LeaveWorkspaceView;
}

export interface LeavePageActionPermissions {
  canCreateRequest: boolean;
  canViewTeamRequests: boolean;
  canOpenTeamCalendarLink: boolean;
}

export interface LeaveRowActionPermissions {
  canOpenDrawer: boolean;
  canApprove: boolean;
  canReject: boolean;
  canRequestDocument: boolean;
  canAmend: boolean;
  canCancelPending: boolean;
  canRequestCancellation: boolean;
  canApproveCancellation: boolean;
  canViewDocument: boolean;
}

export interface LeaveDrawerState {
  requestId: string | null;
  tab: LeaveDrawerTab;
}

export interface LeaveRequestStatusDisplay {
  status: string;
  label: string;
}

export type LeaveCancellationBadge = {
  status: string;
  label: string;
} | null;

export interface LeaveCapabilitiesResult {
  pageActions: LeavePageActionPermissions;
  delegatedApprovalAccess: {
    manager: boolean;
    generalManager: boolean;
    director: boolean;
    hasAny: boolean;
  } | null;
  defaultWorkspaceView: (input: { myRequestCount: number; teamRequestCount: number }) => LeaveWorkspaceView;
  getStatusDisplay: (request: LeaveRequest) => LeaveRequestStatusDisplay;
  getCancellationBadge: (request: LeaveRequest) => LeaveCancellationBadge;
  getRowPermissions: (request: LeaveRequest) => LeaveRowActionPermissions;
  isHistoricalRequest: (request: LeaveRequest) => boolean;
  canViewRequestAtCurrentApprovalStage: (request: LeaveRequest) => boolean;
}
