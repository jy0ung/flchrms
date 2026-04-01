import { test, expect } from '@playwright/test';
import {
  getRoleCredentials,
  login,
  openAdminLeavePoliciesWorkspace,
  type RbacRole,
} from './helpers/rbac';

type RoleVisibilityCase = {
  role: RbacRole;
  expectSettingsOnLeavePage: boolean;
};

const ROLE_VISIBILITY_CASES: RoleVisibilityCase[] = [
  { role: 'employee', expectSettingsOnLeavePage: false },
  { role: 'manager', expectSettingsOnLeavePage: false },
  { role: 'general_manager', expectSettingsOnLeavePage: false },
  { role: 'director', expectSettingsOnLeavePage: false },
  { role: 'hr', expectSettingsOnLeavePage: false },
  { role: 'admin', expectSettingsOnLeavePage: false },
];

test.describe('Leave Phase 2 Operations Visibility @leave @phase2', () => {
  for (const roleCase of ROLE_VISIBILITY_CASES) {
    test(`${roleCase.role} leave page keeps settings surfaces hidden`, async ({ page }) => {
      test.skip(!getRoleCredentials(roleCase.role), `Missing ${roleCase.role} E2E credentials.`);

      await login(page, roleCase.role);
      await page.goto('/leave');
      await expect(page.getByRole('heading', { name: /Leave Management/i })).toBeVisible();

      const delegationHeading = page.getByRole('heading', { name: /Approval Delegations/i });
      const slaHeading = page.getByRole('heading', { name: /Approval SLA Monitor/i });
      const periodOpsSection = page.getByTestId('leave-period-ops-section');

      if (!roleCase.expectSettingsOnLeavePage) {
        await expect(delegationHeading).toHaveCount(0);
        await expect(slaHeading).toHaveCount(0);
        await expect(periodOpsSection).toHaveCount(0);
      }
    });
  }

  for (const role of ['admin', 'hr', 'director'] as const) {
    test(`${role} can access settings under admin leave tab`, async ({ page }) => {
      test.skip(!getRoleCredentials(role), `Missing ${role} E2E credentials.`);

      await login(page, role);
      await openAdminLeavePoliciesWorkspace(page, 'operations');
      await expect(page.getByRole('heading', { name: /Approval Delegations/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Approval SLA Monitor/i })).toBeVisible();
      await expect(page.getByTestId('leave-period-ops-section')).toBeVisible();
    });
  }
});
