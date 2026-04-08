import { describe, expect, it } from 'vitest';
import * as permissions from '@/lib/permissions';
import * as adminPermissions from '@/lib/admin-permissions';
import type { AppRole } from '@/types/hrms';

/**
 * Permission Audit Test Suite
 * 
 * These tests ensure:
 * 1. Permission logic stays consistent
 * 2. All role/capability transitions are predictable
 * 3. No regression in permission checks
 */

describe('Permission Architecture Audit', () => {
  describe('Role Hierarchy', () => {
    it('defines consistent role order', () => {
      expect(permissions.ADMIN_PAGE_ALLOWED_ROLES).toContain('admin');
      expect(permissions.ADMIN_PAGE_ALLOWED_ROLES).toContain('hr');
      expect(permissions.ADMIN_PAGE_ALLOWED_ROLES).toContain('director');
      expect(permissions.ADMIN_PAGE_ALLOWED_ROLES).toContain('general_manager');
      // Manager and employee should NOT have admin access
      expect(permissions.ADMIN_PAGE_ALLOWED_ROLES).not.toContain('manager');
      expect(permissions.ADMIN_PAGE_ALLOWED_ROLES).not.toContain('employee');
    });

    it('aligns navigation permission helpers', () => {
      // Both should return true for admin
      expect(permissions.canAccessAdminPage('admin')).toBe(true);
      expect(permissions.canAccessAdminConsole('admin')).toBe(true);

      // Both should have same result for each role
      const roles: AppRole[] = ['employee', 'manager', 'general_manager', 'hr', 'admin', 'director'];
      roles.forEach(role => {
        expect(permissions.canAccessAdminConsole(role)).toBe(permissions.canAccessAdminPage(role));
      });
    });

    it('ensures canManageDepartments aligns with admin-page roles', () => {
      expect(permissions.canManageDepartments('admin')).toBe(true);
      expect(permissions.canManageDepartments('hr')).toBe(true);
      expect(permissions.canManageDepartments('director')).toBe(true);
      expect(permissions.canManageDepartments('general_manager')).toBe(true);
      // Lower roles cannot manage departments
      expect(permissions.canManageDepartments('manager')).toBe(false);
      expect(permissions.canManageDepartments('employee')).toBe(false);
    });
  });

  describe('Permission Helper Consistency', () => {
    it('all permission helpers handle null/undefined role', () => {
      const helpers = [
        () => permissions.canAccessAdminPage(null),
        () => permissions.canAccessAdminConsole(null),
        () => permissions.canViewEmployeeDirectory(null),
        () => permissions.canManageDocuments(null),
        () => permissions.canManageDepartments(null),
        () => permissions.canViewManagerDashboardWidgets(null),
        () => permissions.canConductPerformanceReviews(null),
      ];

      helpers.forEach(helper => {
        expect(helper()).toBe(false);
      });
    });

    it('role predicate functions (isAdmin, isManager, etc.) return false for null/undefined', () => {
      expect(permissions.isAdmin(null)).toBe(false);
      expect(permissions.isManager(null)).toBe(false);
      expect(permissions.isDirector(null)).toBe(false);
      expect(permissions.isHr(null)).toBe(false);
      expect(permissions.isGeneralManager(null)).toBe(false);
      expect(permissions.isEmployee(null)).toBe(false);
    });

    it('hasRole utility is consistent', () => {
      expect(permissions.hasRole('admin', ['admin', 'hr'])).toBe(true);
      expect(permissions.hasRole('manager', ['admin', 'hr'])).toBe(false);
      expect(permissions.hasRole(null, ['admin'])).toBe(false);
      expect(permissions.hasRole(undefined, ['admin'])).toBe(false);
    });
  });

  describe('Admin Capability Matrix', () => {
    it('all roles have defined capabilities', () => {
      const roles: AppRole[] = ['employee', 'manager', 'general_manager', 'hr', 'admin', 'director'];
      
      roles.forEach(role => {
        const caps = adminPermissions.getAdminCapabilities(role);
        expect(caps).toBeDefined();
        expect(caps.canAccessAdminPage).toBeDefined();
      });
    });

    it('admin always has full access', () => {
      const adminCaps = adminPermissions.getAdminCapabilities('admin');
      expect(adminCaps.canAccessAdminPage).toBe(true);
      expect(adminCaps.canManageRoles).toBe(true);
      expect(adminCaps.canResetEmployeePasswords).toBe(true);
      expect(adminCaps.canManageAdminSettings).toBe(true);
    });

    it('non-admin roles cannot access admin by default', () => {
      const managerCaps = adminPermissions.getAdminCapabilities('manager');
      const employeeCaps = adminPermissions.getAdminCapabilities('employee');

      expect(managerCaps.canAccessAdminPage).toBe(false);
      expect(employeeCaps.canAccessAdminPage).toBe(false);
    });

    it('role permission summaries are documented', () => {
      expect(adminPermissions.getRolePermissionSummary('admin')).toBeTruthy();
      expect(adminPermissions.getRolePermissionSummary('hr')).toBeTruthy();
      expect(adminPermissions.getRolePermissionSummary('director')).toBeTruthy();
      expect(adminPermissions.getRolePermissionSummary('manager')).toBeTruthy();
      expect(adminPermissions.getRolePermissionSummary('employee')).toBeTruthy();
    });
  });

  describe('Leave Balance Permissions', () => {
    it('leave balance permission keys are exported', () => {
      expect(permissions.LEAVE_BALANCE_PERMISSION_KEYS).toContain('view_own_leave_balance');
      expect(permissions.LEAVE_BALANCE_PERMISSION_KEYS).toContain('view_team_leave_balance');
      expect(permissions.LEAVE_BALANCE_PERMISSION_KEYS).toContain('adjust_leave_balance');
    });

    it('all authenticated roles can view own leave balance', () => {
      const roles: AppRole[] = ['employee', 'manager', 'general_manager', 'hr', 'admin', 'director'];
      roles.forEach(role => {
        expect(permissions.canViewOwnLeaveBalance(role)).toBe(true);
      });
      expect(permissions.canViewOwnLeaveBalance(null)).toBe(false);
    });

    it('only admin, hr, director can adjust leave balance', () => {
      expect(permissions.canAdjustLeaveBalance('admin')).toBe(true);
      expect(permissions.canAdjustLeaveBalance('hr')).toBe(true);
      expect(permissions.canAdjustLeaveBalance('director')).toBe(true);
      expect(permissions.canAdjustLeaveBalance('general_manager')).toBe(false);
      expect(permissions.canAdjustLeaveBalance('manager')).toBe(false);
      expect(permissions.canAdjustLeaveBalance('employee')).toBe(false);
    });

    it('getLeaveBalancePermissions returns consistent results', () => {
      const directorPerms = permissions.getLeaveBalancePermissions('director');
      expect(directorPerms.view_own_leave_balance).toBe(permissions.canViewOwnLeaveBalance('director'));
      expect(directorPerms.view_team_leave_balance).toBe(permissions.canViewTeamLeaveBalance('director'));
      expect(directorPerms.adjust_leave_balance).toBe(permissions.canAdjustLeaveBalance('director'));
    });
  });

  describe('Navigation Permission Gating', () => {
    it('all navigation helper functions exist', () => {
      expect(typeof permissions.canAccessAdminConsole).toBe('function');
      expect(typeof permissions.canManageDepartments).toBe('function');
      expect(typeof permissions.canViewEmployeeDirectory).toBe('function');
      expect(typeof permissions.canManageDocuments).toBe('function');
      expect(typeof permissions.canViewManagerDashboardWidgets).toBe('function');
      expect(typeof permissions.canConductPerformanceReviews).toBe('function');
    });

    it('navigation helpers return consistent results across calls', () => {
      const role: AppRole = 'hr';
      expect(permissions.canAccessAdminConsole(role)).toBe(permissions.canAccessAdminConsole(role));
      expect(permissions.canManageDepartments(role)).toBe(permissions.canManageDepartments(role));
    });
  });

  describe('Sensitive Data Access', () => {
    it('only authenticated users can view sensitive employee data', () => {
      expect(permissions.canViewSensitiveEmployeeIdentifiers('admin')).toBe(true);
      expect(permissions.canViewSensitiveEmployeeIdentifiers('hr')).toBe(true);
      expect(permissions.canViewSensitiveEmployeeIdentifiers('employee')).toBe(true);
      expect(permissions.canViewSensitiveEmployeeIdentifiers(null)).toBe(false);
    });

    it('sensitive contact info visibility rules are consistent', () => {
      expect(permissions.canViewSensitiveEmployeeContact('hr')).toBe(true);
      expect(permissions.canViewSensitiveEmployeeContact('director')).toBe(true);
      expect(permissions.canViewSensitiveEmployeeContact('admin')).toBe(true);
    });
  });

  describe('Performance Review Conductors', () => {
    it('correctly identifies performance review conductors', () => {
      // All roles except employee can conduct
      expect(permissions.canConductPerformanceReviews('manager')).toBe(true);
      expect(permissions.canConductPerformanceReviews('general_manager')).toBe(true);
      expect(permissions.canConductPerformanceReviews('hr')).toBe(true);
      expect(permissions.canConductPerformanceReviews('admin')).toBe(true);
      expect(permissions.canConductPerformanceReviews('director')).toBe(true);
      expect(permissions.canConductPerformanceReviews('employee')).toBe(false);
    });
  });

  describe('No Inline Permission Checks', () => {
    it('all permission constants are exported for import', () => {
      expect(permissions.ADMIN_PAGE_ALLOWED_ROLES).toBeDefined();
      expect(permissions.AUTHENTICATED_APP_ROLES).toBeDefined();
      expect(permissions.EMPLOYEE_DIRECTORY_ALLOWED_ROLES).toBeDefined();
      expect(permissions.MANAGER_AND_ABOVE_ROLES).toBeDefined();
      expect(permissions.PERFORMANCE_REVIEW_CONDUCTOR_ROLES).toBeDefined();
    });

    it('all permission helper functions are exported', () => {
      const helpers = [
        'canAccessAdminPage',
        'canAccessAdminConsole',
        'canManageDepartments',
        'canViewEmployeeDirectory',
        'canManageDocuments',
        'canManageHolidays',
        'canManagePayroll',
        'canViewManagerDashboardWidgets',
        'canConductPerformanceReviews',
        'canViewTeamLeaveRequests',
        'canAdjustLeaveBalance',
        'canViewOwnLeaveBalance',
      ];

      helpers.forEach(helper => {
        expect(typeof (permissions as any)[helper]).toBe('function');
      });
    });
  });
});
