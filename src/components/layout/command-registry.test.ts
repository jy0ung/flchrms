import { describe, expect, it } from 'vitest';

import { buildCommandActions, type CommandContext } from './command-registry';

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    role: 'employee',
    canAccessAdminConsole: false,
    canViewEmployeeDirectory: false,
    canManageDepartments: false,
    canCreateEmployee: false,
    canCreateLeaveRequest: true,
    canViewTeamLeaveRequests: false,
    canAccessCalendar: false,
    canManageDocuments: false,
    canConductPerformanceReviews: false,
    canViewAdminQuickActions: false,
    canManageLeavePolicies: false,
    canManageRoles: false,
    hasDelegatedLeaveApproval: false,
    ...overrides,
  };
}

describe('buildCommandActions', () => {
  it('shows self-service commands for an employee and hides privileged ones', () => {
    const actions = buildCommandActions(makeContext());

    expect(actions.map((action) => action.id)).toContain('request-leave');
    expect(actions.map((action) => action.id)).toContain('open-payroll');
    expect(actions.map((action) => action.id)).not.toContain('create-employee');
    expect(actions.map((action) => action.id)).not.toContain('open-admin');
    expect(actions.map((action) => action.id)).not.toContain('review-leave-approvals');
  });

  it('shows management and admin commands when the role has those capabilities', () => {
    const actions = buildCommandActions(
      makeContext({
        role: 'admin',
        canAccessAdminConsole: true,
        canViewEmployeeDirectory: true,
        canManageDepartments: true,
        canCreateEmployee: true,
        canViewTeamLeaveRequests: true,
        canAccessCalendar: true,
        canManageDocuments: true,
        canConductPerformanceReviews: true,
        canViewAdminQuickActions: true,
        canManageLeavePolicies: true,
        canManageRoles: true,
      }),
    );

    expect(actions.find((action) => action.id === 'open-employees')?.label).toBe('Open Employees');
    expect(actions.map((action) => action.id)).toContain('create-employee');
    expect(actions.map((action) => action.id)).toContain('create-department');
    expect(actions.map((action) => action.id)).toContain('review-leave-approvals');
    expect(actions.find((action) => action.id === 'open-admin')?.label).toBe('Open Governance');
    expect(actions.find((action) => action.id === 'open-admin-quick-actions')?.label).toBe('Open Governance Hub');
    expect(actions.map((action) => action.id)).toContain('open-role-management');
  });

  it('shows approval review for delegated approvers even without manager role', () => {
    const actions = buildCommandActions(
      makeContext({
        role: 'employee',
        hasDelegatedLeaveApproval: true,
      }),
    );

    expect(actions.map((action) => action.id)).toContain('review-leave-approvals');
  });
});
