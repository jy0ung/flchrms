import type { LeaveRequest } from '@/types/hrms';

type LeaveRequestIdentityLike = Pick<LeaveRequest, 'employee' | 'employee_id' | 'leave_type'>;

export function getLeaveRequestEmployeeName(request: LeaveRequestIdentityLike): string {
  const firstName = request.employee?.first_name?.trim();
  const lastName = request.employee?.last_name?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (fullName) return fullName;

  const email = request.employee?.email?.trim();
  if (email) return email;

  return request.employee_id;
}

export function getLeaveRequestEmployeeEmail(request: LeaveRequestIdentityLike): string {
  const email = request.employee?.email?.trim();
  return email || '—';
}

export function getLeaveRequestDialogDescription(request: LeaveRequestIdentityLike | null | undefined): string {
  if (!request) return 'Leave Request';

  const employeeLabel = getLeaveRequestEmployeeName(request);
  const leaveTypeLabel = request.leave_type?.name?.trim() || 'Leave Request';

  return `${employeeLabel} - ${leaveTypeLabel}`;
}

export function getLeaveRequestDrawerTitle(request: LeaveRequestIdentityLike | null | undefined): string {
  if (!request) return 'Leave Request';

  const leaveTypeLabel = request.leave_type?.name?.trim() || 'Leave Request';
  const employeeLabel = getLeaveRequestEmployeeName(request);

  return `${leaveTypeLabel} · ${employeeLabel}`;
}
