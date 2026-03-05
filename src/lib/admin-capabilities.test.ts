import { describe, expect, it } from 'vitest';
import {
  getDefaultAdminCapabilityMap,
  isAdminCapabilityLocked,
} from '@/lib/admin-capabilities';

describe('admin-capabilities defaults', () => {
  it('returns full admin capabilities', () => {
    const capabilities = getDefaultAdminCapabilityMap('admin');
    expect(Object.values(capabilities).every(Boolean)).toBe(true);
  });

  it('returns general manager scoped capabilities', () => {
    const capabilities = getDefaultAdminCapabilityMap('general_manager');
    expect(capabilities.access_admin_console).toBe(true);
    expect(capabilities.view_admin_dashboard).toBe(true);
    expect(capabilities.view_admin_quick_actions).toBe(true);
    expect(capabilities.manage_employee_directory).toBe(true);
    expect(capabilities.create_employee).toBe(true);
    expect(capabilities.view_sensitive_employee_identifiers).toBe(true);

    expect(capabilities.manage_roles).toBe(false);
    expect(capabilities.manage_departments).toBe(false);
    expect(capabilities.manage_leave_policies).toBe(false);
    expect(capabilities.manage_announcements).toBe(false);
    expect(capabilities.manage_admin_settings).toBe(false);
  });

  it('falls back to all false for unknown role value', () => {
    const capabilities = getDefaultAdminCapabilityMap(null);
    expect(Object.values(capabilities).every((value) => value === false)).toBe(true);
  });

  it('locks admin console + role-management safety switches for admin role', () => {
    expect(isAdminCapabilityLocked('admin', 'access_admin_console')).toBe(true);
    expect(isAdminCapabilityLocked('admin', 'manage_roles')).toBe(true);
    expect(isAdminCapabilityLocked('admin', 'create_employee')).toBe(false);
  });
});
