import type { LeaveRequest, LeaveCancellationStatus } from '@/types/hrms';

const PENDING_CANCELLATION_STATUSES = new Set<LeaveCancellationStatus>([
  'pending',
  'manager_approved',
  'gm_approved',
  'director_approved',
]);

/**
 * Returns true when the leave request has a cancellation workflow in progress (not yet resolved).
 * Shared utility used by Leave.tsx, LeaveRequestWorkspace.tsx, and other leave UI code.
 */
export function isCancellationPending(request: LeaveRequest): boolean {
  return Boolean(
    request.cancellation_status &&
      PENDING_CANCELLATION_STATUSES.has(request.cancellation_status),
  );
}
