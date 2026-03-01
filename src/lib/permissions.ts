import type { AppRole } from '@/types/hrms';

export type MaybeRole = AppRole | null | undefined;

export const EMPLOYEE_DIRECTORY_ALLOWED_ROLES: AppRole[] = [
  'admin',
  'hr',
  'manager',
  'general_manager',
  'director',
];

export const ADMIN_PAGE_ALLOWED_ROLES: AppRole[] = ['admin', 'hr', 'director'];

export const MANAGER_AND_ABOVE_ROLES: AppRole[] = [
  'manager',
  'general_manager',
  'director',
  'hr',
  'admin',
];

export const TEAM_LEAVE_VIEWER_ROLES: AppRole[] = [
  'manager',
  'general_manager',
  'director',
  'hr',
  'admin',
];

export const EXECUTIVE_SUMMARY_VIEWER_ROLES: AppRole[] = [
  'manager',
  'general_manager',
  'director',
  'hr',
  'admin',
];

export const EXECUTIVE_CRITICAL_DASHBOARD_ROLES: AppRole[] = [
  'general_manager',
  'director',
  'hr',
  'admin',
];

export const PAYROLL_MANAGER_ROLES: AppRole[] = ['hr', 'director'];
export const DOCUMENT_MANAGER_ROLES: AppRole[] = ['hr', 'director'];
export const HOLIDAY_MANAGER_ROLES: AppRole[] = ['hr', 'director', 'admin'];
export const DEPARTMENT_EVENT_MANAGER_ROLES: AppRole[] = [
  'hr',
  'director',
  'admin',
  'manager',
  'general_manager',
];
export const PERFORMANCE_REVIEW_CONDUCTOR_ROLES: AppRole[] = [
  'manager',
  'general_manager',
  'hr',
  'admin',
  'director',
];

export function hasRole(role: MaybeRole, allowedRoles: readonly AppRole[]) {
  return !!role && allowedRoles.includes(role);
}

export function isEmployee(role: MaybeRole) {
  return role === 'employee';
}

export function isManager(role: MaybeRole) {
  return role === 'manager';
}

export function isGeneralManager(role: MaybeRole) {
  return role === 'general_manager';
}

export function isDirector(role: MaybeRole) {
  return role === 'director';
}

export function isHr(role: MaybeRole) {
  return role === 'hr';
}

export function isAdmin(role: MaybeRole) {
  return role === 'admin';
}

export function canAccessAdminPage(role: MaybeRole) {
  return hasRole(role, ADMIN_PAGE_ALLOWED_ROLES);
}

export function canViewEmployeeDirectory(role: MaybeRole) {
  return hasRole(role, EMPLOYEE_DIRECTORY_ALLOWED_ROLES);
}

export function canViewManagerDashboardWidgets(role: MaybeRole) {
  return hasRole(role, MANAGER_AND_ABOVE_ROLES);
}

export function canViewExecutiveSummary(role: MaybeRole) {
  return hasRole(role, EXECUTIVE_SUMMARY_VIEWER_ROLES);
}

export function canQueryExecutiveStats(role: MaybeRole) {
  return canViewExecutiveSummary(role);
}

export function canViewExecutiveCriticalDashboard(role: MaybeRole) {
  return hasRole(role, EXECUTIVE_CRITICAL_DASHBOARD_ROLES);
}

export function canManagePayroll(role: MaybeRole) {
  return hasRole(role, PAYROLL_MANAGER_ROLES);
}

export function canManageDocuments(role: MaybeRole) {
  return hasRole(role, DOCUMENT_MANAGER_ROLES);
}

export function canManageHolidays(role: MaybeRole) {
  return hasRole(role, HOLIDAY_MANAGER_ROLES);
}

export function canManageDepartmentEvents(role: MaybeRole) {
  return hasRole(role, DEPARTMENT_EVENT_MANAGER_ROLES);
}

export function canViewSensitiveEmployeeIdentifiers(role: MaybeRole) {
  return role !== 'admin';
}

export function canViewSensitiveEmployeeContact(role: MaybeRole) {
  return role !== 'admin';
}

export function canViewCalendarLeaveTypeLabel(role: MaybeRole) {
  return !!role && role !== 'employee';
}

export function canViewTeamLeaveRequests(role: MaybeRole) {
  return hasRole(role, TEAM_LEAVE_VIEWER_ROLES);
}

export function canRequestLeaveSupportingDocument(role: MaybeRole) {
  return hasRole(role, MANAGER_AND_ABOVE_ROLES);
}

export function canViewLeaveSupportingDocument(role: MaybeRole) {
  return !!role && role !== 'admin';
}

export function canConductPerformanceReviews(role: MaybeRole) {
  return hasRole(role, PERFORMANCE_REVIEW_CONDUCTOR_ROLES);
}
