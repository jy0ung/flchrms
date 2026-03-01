import { describe, expect, it } from 'vitest';
import { getAdminCapabilities, getRolePermissionSummary } from '@/lib/admin-permissions';

describe('admin-permissions', () => {
  it('returns admin app-configuration capabilities with sensitive-data restrictions', () => {
    const caps = getAdminCapabilities('admin');

    expect(caps.canAccessAdminPage).toBe(true);
    expect(caps.canManageRoles).toBe(true);
    expect(caps.canResetEmployeePasswords).toBe(true);
    expect(caps.canManageEmployeeProfiles).toBe(false);
    expect(caps.canCreateEmployee).toBe(false);
    expect(caps.canManageDepartments).toBe(true);
    expect(caps.canManageLeaveTypes).toBe(true);
    expect(caps.canOpenAccountProfileEditor).toBe(true);
    expect(caps.isAdminLimitedProfileEditor).toBe(true);
    expect(caps.canViewSensitiveEmployeeIdentifiers).toBe(false);
  });

  it('returns HR capabilities', () => {
    const caps = getAdminCapabilities('hr');

    expect(caps.canAccessAdminPage).toBe(true);
    expect(caps.canManageEmployeeProfiles).toBe(true);
    expect(caps.canCreateEmployee).toBe(true);
    expect(caps.canManageDepartments).toBe(true);
    expect(caps.canManageLeaveTypes).toBe(true);
    expect(caps.canManageRoles).toBe(false);
    expect(caps.canResetEmployeePasswords).toBe(true);
    expect(caps.isAdminLimitedProfileEditor).toBe(false);
    expect(caps.canViewSensitiveEmployeeIdentifiers).toBe(true);
  });

  it('returns director capabilities', () => {
    const caps = getAdminCapabilities('director');

    expect(caps.canAccessAdminPage).toBe(true);
    expect(caps.canManageEmployeeProfiles).toBe(true);
    expect(caps.canCreateEmployee).toBe(true);
    expect(caps.canManageDepartments).toBe(true);
    expect(caps.canManageLeaveTypes).toBe(true);
    expect(caps.canManageRoles).toBe(true);
    expect(caps.canResetEmployeePasswords).toBe(false);
    expect(caps.isAdminLimitedProfileEditor).toBe(false);
    expect(caps.canViewSensitiveEmployeeIdentifiers).toBe(true);
  });

  it('blocks non-admin-page roles', () => {
    expect(getAdminCapabilities('manager').canAccessAdminPage).toBe(false);
    expect(getAdminCapabilities('employee').canAccessAdminPage).toBe(false);
    expect(getAdminCapabilities(null).canAccessAdminPage).toBe(false);
    // Employee and manager cannot create employees
    expect(getAdminCapabilities('employee').canCreateEmployee).toBe(false);
    expect(getAdminCapabilities('manager').canCreateEmployee).toBe(false);
  });

  it('returns expected role summaries', () => {
    expect(getRolePermissionSummary('admin')).toContain('System administration');
    expect(getRolePermissionSummary('hr')).toContain('Employee management');
    expect(getRolePermissionSummary('director')).toContain('Unrestricted business access');
    expect(getRolePermissionSummary('employee')).toContain('Self-service');
  });
});
