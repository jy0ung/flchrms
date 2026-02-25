import { describe, expect, it } from 'vitest';
import {
  ADMIN_PAGE_ALLOWED_ROLES,
  EMPLOYEE_DIRECTORY_ALLOWED_ROLES,
  canAccessAdminPage,
  canManageDepartmentEvents,
  canManageDocuments,
  canManageHolidays,
  canManagePayroll,
  canViewCalendarLeaveTypeLabel,
  canViewSensitiveEmployeeContact,
  canViewSensitiveEmployeeIdentifiers,
  canViewEmployeeDirectory,
  canViewManagerDashboardWidgets,
  canViewTeamLeaveRequests,
  canViewLeaveSupportingDocument,
  canRequestLeaveSupportingDocument,
  canConductPerformanceReviews,
} from '@/lib/permissions';

describe('permissions', () => {
  it('exports protected-route role lists', () => {
    expect(EMPLOYEE_DIRECTORY_ALLOWED_ROLES).toEqual([
      'admin',
      'hr',
      'manager',
      'general_manager',
      'director',
    ]);
    expect(ADMIN_PAGE_ALLOWED_ROLES).toEqual(['admin', 'hr', 'director']);
  });

  it('matches admin-page access rules', () => {
    expect(canAccessAdminPage('admin')).toBe(true);
    expect(canAccessAdminPage('hr')).toBe(true);
    expect(canAccessAdminPage('director')).toBe(true);
    expect(canAccessAdminPage('manager')).toBe(false);
    expect(canAccessAdminPage('employee')).toBe(false);
    expect(canAccessAdminPage(null)).toBe(false);
  });

  it('matches employee-directory access rules', () => {
    expect(canViewEmployeeDirectory('manager')).toBe(true);
    expect(canViewEmployeeDirectory('general_manager')).toBe(true);
    expect(canViewEmployeeDirectory('employee')).toBe(false);
  });

  it('matches dashboard visibility rules', () => {
    expect(canViewManagerDashboardWidgets('manager')).toBe(true);
    expect(canViewManagerDashboardWidgets('general_manager')).toBe(true);
    expect(canViewManagerDashboardWidgets('director')).toBe(true);
    expect(canViewManagerDashboardWidgets('hr')).toBe(true);
    expect(canViewManagerDashboardWidgets('admin')).toBe(true);
    expect(canViewManagerDashboardWidgets('employee')).toBe(false);
  });

  it('matches business module management rules', () => {
    expect(canManagePayroll('hr')).toBe(true);
    expect(canManagePayroll('director')).toBe(true);
    expect(canManagePayroll('admin')).toBe(false);

    expect(canManageDocuments('hr')).toBe(true);
    expect(canManageDocuments('director')).toBe(true);
    expect(canManageDocuments('admin')).toBe(false);

    expect(canManageHolidays('hr')).toBe(true);
    expect(canManageHolidays('director')).toBe(true);
    expect(canManageHolidays('admin')).toBe(true);
    expect(canManageHolidays('manager')).toBe(false);

    expect(canManageDepartmentEvents('manager')).toBe(true);
    expect(canManageDepartmentEvents('general_manager')).toBe(true);
    expect(canManageDepartmentEvents('admin')).toBe(true);
    expect(canManageDepartmentEvents('employee')).toBe(false);
  });

  it('matches leave-view/document visibility rules', () => {
    expect(canViewTeamLeaveRequests('manager')).toBe(true);
    expect(canViewTeamLeaveRequests('hr')).toBe(true);
    expect(canViewTeamLeaveRequests('employee')).toBe(false);

    expect(canRequestLeaveSupportingDocument('manager')).toBe(true);
    expect(canRequestLeaveSupportingDocument('director')).toBe(false);

    expect(canViewLeaveSupportingDocument('employee')).toBe(true);
    expect(canViewLeaveSupportingDocument('admin')).toBe(false);
    expect(canViewLeaveSupportingDocument(null)).toBe(false);
  });

  it('matches calendar privacy and performance-review rules', () => {
    expect(canViewCalendarLeaveTypeLabel('employee')).toBe(false);
    expect(canViewCalendarLeaveTypeLabel('manager')).toBe(true);

    expect(canConductPerformanceReviews('manager')).toBe(true);
    expect(canConductPerformanceReviews('hr')).toBe(true);
    expect(canConductPerformanceReviews('director')).toBe(true);
    expect(canConductPerformanceReviews('employee')).toBe(false);

    expect(canViewSensitiveEmployeeIdentifiers('admin')).toBe(false);
    expect(canViewSensitiveEmployeeIdentifiers('hr')).toBe(true);
    expect(canViewSensitiveEmployeeContact('admin')).toBe(false);
    expect(canViewSensitiveEmployeeContact('director')).toBe(true);
  });
});
