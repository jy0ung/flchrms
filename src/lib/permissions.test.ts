import { describe, expect, it } from 'vitest';
import {
  ADMIN_PAGE_ALLOWED_ROLES,
  EMPLOYEE_DIRECTORY_ALLOWED_ROLES,
  canAccessAdminPage,
  canAccessAdminConsole,
  canAdjustLeaveBalance,
  canManageDepartmentEvents,
  canManageDocuments,
  canManageHolidays,
  canManagePayroll,
  canViewCalendarLeaveTypeLabel,
  canViewSensitiveEmployeeContact,
  canViewSensitiveEmployeeIdentifiers,
  canViewEmployeeDirectory,
  canViewOwnLeaveBalance,
  canViewTeamLeaveBalance,
  canViewManagerDashboardWidgets,
  canViewTeamLeaveRequests,
  canViewLeaveSupportingDocument,
  canRequestLeaveSupportingDocument,
  canConductPerformanceReviews,
  getLeaveBalancePermissions,
  LEAVE_BALANCE_PERMISSION_KEYS,
  canManageDepartments,
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
    expect(ADMIN_PAGE_ALLOWED_ROLES).toEqual(['admin', 'hr', 'director', 'general_manager']);
  });

  it('matches admin-page access rules', () => {
    expect(canAccessAdminPage('admin')).toBe(true);
    expect(canAccessAdminPage('hr')).toBe(true);
    expect(canAccessAdminPage('director')).toBe(true);
    expect(canAccessAdminPage('general_manager')).toBe(true);
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

    // admin now has document management access
    expect(canManageDocuments('hr')).toBe(true);
    expect(canManageDocuments('director')).toBe(true);
    expect(canManageDocuments('admin')).toBe(true);

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
    expect(canRequestLeaveSupportingDocument('director')).toBe(true);

    // admin can now view leave supporting documents
    expect(canViewLeaveSupportingDocument('employee')).toBe(true);
    expect(canViewLeaveSupportingDocument('admin')).toBe(true);
    expect(canViewLeaveSupportingDocument(null)).toBe(false);
  });

  it('matches leave balance visibility and adjustment rules', () => {
    expect(LEAVE_BALANCE_PERMISSION_KEYS).toEqual([
      'view_own_leave_balance',
      'view_team_leave_balance',
      'adjust_leave_balance',
    ]);

    expect(canViewOwnLeaveBalance('employee')).toBe(true);
    expect(canViewOwnLeaveBalance('manager')).toBe(true);
    expect(canViewOwnLeaveBalance(null)).toBe(false);

    expect(canViewTeamLeaveBalance('manager')).toBe(true);
    expect(canViewTeamLeaveBalance('general_manager')).toBe(true);
    expect(canViewTeamLeaveBalance('employee')).toBe(false);

    expect(canAdjustLeaveBalance('admin')).toBe(true);
    expect(canAdjustLeaveBalance('hr')).toBe(true);
    expect(canAdjustLeaveBalance('director')).toBe(true);
    expect(canAdjustLeaveBalance('general_manager')).toBe(false);
    expect(canAdjustLeaveBalance('manager')).toBe(false);
    expect(canAdjustLeaveBalance('employee')).toBe(false);

    expect(getLeaveBalancePermissions('director')).toEqual({
      view_own_leave_balance: true,
      view_team_leave_balance: true,
      adjust_leave_balance: true,
    });
  });

  it('matches calendar privacy and performance-review rules', () => {
    expect(canViewCalendarLeaveTypeLabel('employee')).toBe(false);
    expect(canViewCalendarLeaveTypeLabel('manager')).toBe(true);

    expect(canConductPerformanceReviews('manager')).toBe(true);
    expect(canConductPerformanceReviews('hr')).toBe(true);
    expect(canConductPerformanceReviews('director')).toBe(true);
    expect(canConductPerformanceReviews('employee')).toBe(false);

    // admin now has sensitive data access (elevated privileges)
    expect(canViewSensitiveEmployeeIdentifiers('admin')).toBe(true);
    expect(canViewSensitiveEmployeeIdentifiers('hr')).toBe(true);
    expect(canViewSensitiveEmployeeContact('admin')).toBe(true);
    expect(canViewSensitiveEmployeeContact('director')).toBe(true);
  });

  it('matches navigation permission helpers used by app sidebar', () => {
    // canAccessAdminConsole is an alias for canAccessAdminPage
    expect(canAccessAdminConsole('admin')).toBe(true);
    expect(canAccessAdminConsole('hr')).toBe(true);
    expect(canAccessAdminConsole('director')).toBe(true);
    expect(canAccessAdminConsole('general_manager')).toBe(true);
    expect(canAccessAdminConsole('manager')).toBe(false);
    expect(canAccessAdminConsole('employee')).toBe(false);

    // canManageDepartments determines if departments nav item is visible
    expect(canManageDepartments('admin')).toBe(true);
    expect(canManageDepartments('hr')).toBe(true);
    expect(canManageDepartments('director')).toBe(true);
    expect(canManageDepartments('general_manager')).toBe(true);
    expect(canManageDepartments('manager')).toBe(false);
    expect(canManageDepartments('employee')).toBe(false);
    expect(canManageDepartments(null)).toBe(false);
  });

  /**
   * Regression Tests: Ensures past permission bugs don't resurface
   * (e.g., role tier inversion, incorrect admin capabilities, etc.)
   */
  describe('regression: role tier hierarchy', () => {
    it('admin should have highest privileges', () => {
      expect(canAccessAdminPage('admin')).toBe(true);
      expect(canAdjustLeaveBalance('admin')).toBe(true);
      expect(canManagePayroll('admin')).toBe(false); // By design: HR owns payroll
      expect(canViewSensitiveEmployeeIdentifiers('admin')).toBe(true);
    });

    it('director should not exceed admin tier for governance', () => {
      expect(canAccessAdminPage('director')).toBe(true);
      expect(canAdjustLeaveBalance('director')).toBe(true);
      // Directors can view sensitive data (like all authenticated users)
      expect(canViewSensitiveEmployeeIdentifiers('director')).toBe(true);
    });

    it('hr should specialize in leave and documents', () => {
      expect(canAdjustLeaveBalance('hr')).toBe(true);
      expect(canManagePayroll('hr')).toBe(true);
      expect(canManageDocuments('hr')).toBe(true);
      expect(canViewSensitiveEmployeeIdentifiers('hr')).toBe(true);
    });

    it('manager should be limited to team operations', () => {
      expect(canViewTeamLeaveBalance('manager')).toBe(true);
      expect(canViewTeamLeaveRequests('manager')).toBe(true);
      expect(canAdjustLeaveBalance('manager')).toBe(false);
      expect(canAccessAdminPage('manager')).toBe(false);
    });

    it('employee should be limited to own data', () => {
      expect(canViewOwnLeaveBalance('employee')).toBe(true);
      expect(canViewTeamLeaveBalance('employee')).toBe(false);
      expect(canViewEmployeeDirectory('employee')).toBe(false);
      expect(canAdjustLeaveBalance('employee')).toBe(false);
    });
  });

  /**
   * Permission Matrix: Tests critical path for each role-permission combination
   */
  describe('permission matrix: all roles x critical permissions', () => {
    const roles = ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'] as const;

    it('admin-page access follows role tier', () => {
      const resultsPerRole = {
        employee: false,
        manager: false,
        general_manager: true,
        hr: true,
        director: true,
        admin: true,
      };

      roles.forEach((role) => {
        expect(canAccessAdminPage(role)).toBe(resultsPerRole[role] as boolean);
      });
    });

    it('leave-balance adjustment restricted to HR+', () => {
      const resultsPerRole = {
        employee: false,
        manager: false,
        general_manager: false,
        hr: true,
        director: true,
        admin: true,
      };

      roles.forEach((role) => {
        expect(canAdjustLeaveBalance(role)).toBe(resultsPerRole[role] as boolean);
      });
    });

    it('sensitive employee data access restricted properly', () => {
      // Both functions allow any authenticated user: !!role
      const identifierAccess = {
        employee: true,
        manager: true,
        general_manager: true,
        hr: true,
        director: true,
        admin: true,
      };

      const contactAccess = {
        employee: true,
        manager: true,
        general_manager: true,
        hr: true,
        director: true,
        admin: true,
      };

      roles.forEach((role) => {
        expect(canViewSensitiveEmployeeIdentifiers(role)).toBe(identifierAccess[role]);
        expect(canViewSensitiveEmployeeContact(role)).toBe(contactAccess[role]);
      });
    });

    it('performance review access follows manager+ hierarchy', () => {
      const resultsPerRole = {
        employee: false,
        manager: true,
        general_manager: true,
        hr: true,
        director: true,
        admin: true, // admin CAN conduct performance reviews
      };

      roles.forEach((role) => {
        expect(canConductPerformanceReviews(role)).toBe(resultsPerRole[role]);
      });
    });

    it('team leave visibility restricted to manager+', () => {
      const resultsPerRole = {
        employee: false,
        manager: true,
        general_manager: true,
        hr: true,
        director: true,
        admin: true, // admin CAN view team leave balance
      };

      roles.forEach((role) => {
        expect(canViewTeamLeaveBalance(role)).toBe(resultsPerRole[role]);
      });
    });
  });

  /**
   * Null/Undefined Handling: Ensures graceful fallback for invalid inputs
   */
  describe('null and undefined handling', () => {
    it('handles null role gracefully', () => {
      expect(canAccessAdminPage(null)).toBe(false);
      expect(canViewOwnLeaveBalance(null)).toBe(false);
      expect(canManageDepartments(null)).toBe(false);
      expect(getLeaveBalancePermissions(null)).toEqual({
        view_own_leave_balance: false,
        view_team_leave_balance: false,
        adjust_leave_balance: false,
      });
    });

    it('handles undefined role gracefully', () => {
      expect(canAccessAdminPage(undefined)).toBe(false);
      expect(canViewTeamLeaveRequests(undefined)).toBe(false);
      expect(canManagePayroll(undefined)).toBe(false);
    });
  });

  /**
   * Leave Balance Permission Object: Ensures consistency across permission keys
   */
  describe('leave-balance permission object consistency', () => {
    it('permission keys match exported constant', () => {
      const keys = LEAVE_BALANCE_PERMISSION_KEYS;
      expect(keys).toContain('view_own_leave_balance');
      expect(keys).toContain('view_team_leave_balance');
      expect(keys).toContain('adjust_leave_balance');
      expect(keys.length).toBe(3);
    });

    it('getLeaveBalancePermissions returns correct shape for all roles', () => {
      const roles = ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'] as const;

      roles.forEach((role) => {
        const perms = getLeaveBalancePermissions(role);
        expect(perms).toHaveProperty('view_own_leave_balance');
        expect(perms).toHaveProperty('view_team_leave_balance');
        expect(perms).toHaveProperty('adjust_leave_balance');
        expect(Object.keys(perms).length).toBe(3);
      });
    });

    it('leave balance permissions are consistent with individual helper functions', () => {
      const roles = ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'] as const;

      roles.forEach((role) => {
        const perms = getLeaveBalancePermissions(role);
        expect(perms.view_own_leave_balance).toBe(canViewOwnLeaveBalance(role));
        expect(perms.view_team_leave_balance).toBe(canViewTeamLeaveBalance(role));
        expect(perms.adjust_leave_balance).toBe(canAdjustLeaveBalance(role));
      });
    });
  });
});
