import { describe, expect, it } from 'vitest';
import {
  hasRole,
  isEmployee,
  isManager,
  isGeneralManager,
  isDirector,
  isHr,
  isAdmin,
  canViewExecutiveSummary,
  canQueryExecutiveStats,
  canViewExecutiveCriticalDashboard,
  canViewCalendarLeaveTypeLabel,
  canViewSensitiveEmployeeIdentifiers,
  canViewSensitiveEmployeeContact,
  canViewLeaveSupportingDocument,
  canRequestLeaveSupportingDocument,
  canConductPerformanceReviews,
  canManageDepartmentEvents,
  canManageDocuments,
  canManageHolidays,
  canViewTeamLeaveRequests,
} from '@/lib/permissions';
import type { AppRole } from '@/types/hrms';

const ALL_ROLES: AppRole[] = ['employee', 'manager', 'general_manager', 'director', 'hr', 'admin'];

// ── hasRole helper ───────────────────────────────────────────────
describe('hasRole', () => {
  it('returns true if role is in the allowed list', () => {
    expect(hasRole('admin', ['admin', 'hr'])).toBe(true);
  });

  it('returns false if role is not in the allowed list', () => {
    expect(hasRole('employee', ['admin', 'hr'])).toBe(false);
  });

  it('returns false for null role', () => {
    expect(hasRole(null, ['admin'])).toBe(false);
  });

  it('returns false for undefined role', () => {
    expect(hasRole(undefined, ['admin'])).toBe(false);
  });

  it('returns false for empty allowed list', () => {
    expect(hasRole('admin', [])).toBe(false);
  });
});

// ── Role identity checks ────────────────────────────────────────
describe('role identity functions', () => {
  it.each([
    ['isEmployee', isEmployee, 'employee'],
    ['isManager', isManager, 'manager'],
    ['isGeneralManager', isGeneralManager, 'general_manager'],
    ['isDirector', isDirector, 'director'],
    ['isHr', isHr, 'hr'],
    ['isAdmin', isAdmin, 'admin'],
  ] as const)('%s returns true only for matching role', (_name, fn, matchingRole) => {
    for (const role of ALL_ROLES) {
      expect(fn(role)).toBe(role === matchingRole);
    }
    expect(fn(null)).toBe(false);
    expect(fn(undefined)).toBe(false);
  });
});

// ── Executive dashboard visibility ───────────────────────────────
describe('executive visibility permissions', () => {
  it('canViewExecutiveSummary grants manager and above', () => {
    expect(canViewExecutiveSummary('employee')).toBe(false);
    expect(canViewExecutiveSummary('manager')).toBe(true);
    expect(canViewExecutiveSummary('general_manager')).toBe(true);
    expect(canViewExecutiveSummary('director')).toBe(true);
    expect(canViewExecutiveSummary('hr')).toBe(true);
    expect(canViewExecutiveSummary('admin')).toBe(true);
    expect(canViewExecutiveSummary(null)).toBe(false);
  });

  it('canQueryExecutiveStats mirrors canViewExecutiveSummary', () => {
    for (const role of ALL_ROLES) {
      expect(canQueryExecutiveStats(role)).toBe(canViewExecutiveSummary(role));
    }
  });

  it('canViewExecutiveCriticalDashboard is more restrictive — gm/director/hr/admin only', () => {
    expect(canViewExecutiveCriticalDashboard('employee')).toBe(false);
    expect(canViewExecutiveCriticalDashboard('manager')).toBe(false);
    expect(canViewExecutiveCriticalDashboard('general_manager')).toBe(true);
    expect(canViewExecutiveCriticalDashboard('director')).toBe(true);
    expect(canViewExecutiveCriticalDashboard('hr')).toBe(true);
    expect(canViewExecutiveCriticalDashboard('admin')).toBe(true);
  });
});

// ── Calendar label visibility ────────────────────────────────────
describe('canViewCalendarLeaveTypeLabel', () => {
  it('hides leave type labels from employees', () => {
    expect(canViewCalendarLeaveTypeLabel('employee')).toBe(false);
  });

  it('shows labels to all non-employee roles', () => {
    for (const role of ALL_ROLES.filter(r => r !== 'employee')) {
      expect(canViewCalendarLeaveTypeLabel(role)).toBe(true);
    }
  });

  it('returns false for null', () => {
    expect(canViewCalendarLeaveTypeLabel(null)).toBe(false);
  });
});

// ── Sensitive data visibility ────────────────────────────────────
describe('sensitive data visibility', () => {
  it('canViewSensitiveEmployeeIdentifiers requires any role', () => {
    for (const role of ALL_ROLES) {
      expect(canViewSensitiveEmployeeIdentifiers(role)).toBe(true);
    }
    expect(canViewSensitiveEmployeeIdentifiers(null)).toBe(false);
  });

  it('canViewSensitiveEmployeeContact requires any role', () => {
    for (const role of ALL_ROLES) {
      expect(canViewSensitiveEmployeeContact(role)).toBe(true);
    }
    expect(canViewSensitiveEmployeeContact(null)).toBe(false);
  });
});

// ── Leave document permissions ───────────────────────────────────
describe('leave document permissions', () => {
  it('canRequestLeaveSupportingDocument grants manager+', () => {
    expect(canRequestLeaveSupportingDocument('employee')).toBe(false);
    expect(canRequestLeaveSupportingDocument('manager')).toBe(true);
    expect(canRequestLeaveSupportingDocument('general_manager')).toBe(true);
    expect(canRequestLeaveSupportingDocument('director')).toBe(true);
    expect(canRequestLeaveSupportingDocument('hr')).toBe(true);
    expect(canRequestLeaveSupportingDocument('admin')).toBe(true);
  });

  it('canViewLeaveSupportingDocument grants any authenticated role', () => {
    for (const role of ALL_ROLES) {
      expect(canViewLeaveSupportingDocument(role)).toBe(true);
    }
    expect(canViewLeaveSupportingDocument(null)).toBe(false);
  });
});

// ── Module management ────────────────────────────────────────────
describe('module management permissions', () => {
  it('canManageDocuments: hr, director, admin', () => {
    expect(canManageDocuments('hr')).toBe(true);
    expect(canManageDocuments('director')).toBe(true);
    expect(canManageDocuments('admin')).toBe(true);
    expect(canManageDocuments('manager')).toBe(false);
    expect(canManageDocuments('employee')).toBe(false);
    expect(canManageDocuments('general_manager')).toBe(false);
  });

  it('canManageHolidays: hr, director, admin', () => {
    expect(canManageHolidays('hr')).toBe(true);
    expect(canManageHolidays('director')).toBe(true);
    expect(canManageHolidays('admin')).toBe(true);
    expect(canManageHolidays('manager')).toBe(false);
    expect(canManageHolidays('employee')).toBe(false);
  });

  it('canManageDepartmentEvents: hr, director, admin, manager, gm', () => {
    expect(canManageDepartmentEvents('hr')).toBe(true);
    expect(canManageDepartmentEvents('director')).toBe(true);
    expect(canManageDepartmentEvents('admin')).toBe(true);
    expect(canManageDepartmentEvents('manager')).toBe(true);
    expect(canManageDepartmentEvents('general_manager')).toBe(true);
    expect(canManageDepartmentEvents('employee')).toBe(false);
  });

  it('canViewTeamLeaveRequests: manager+', () => {
    expect(canViewTeamLeaveRequests('manager')).toBe(true);
    expect(canViewTeamLeaveRequests('general_manager')).toBe(true);
    expect(canViewTeamLeaveRequests('director')).toBe(true);
    expect(canViewTeamLeaveRequests('hr')).toBe(true);
    expect(canViewTeamLeaveRequests('admin')).toBe(true);
    expect(canViewTeamLeaveRequests('employee')).toBe(false);
  });

  it('canConductPerformanceReviews: manager+', () => {
    expect(canConductPerformanceReviews('manager')).toBe(true);
    expect(canConductPerformanceReviews('general_manager')).toBe(true);
    expect(canConductPerformanceReviews('hr')).toBe(true);
    expect(canConductPerformanceReviews('admin')).toBe(true);
    expect(canConductPerformanceReviews('director')).toBe(true);
    expect(canConductPerformanceReviews('employee')).toBe(false);
    expect(canConductPerformanceReviews(null)).toBe(false);
  });
});
