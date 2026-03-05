import { test, expect } from '@playwright/test';
import { getRoleCredentials, login, type RbacRole } from './helpers/rbac';

type RoleVisibilityCase = {
  role: RbacRole;
  expectTeamSections: boolean;
  expectPeriodOps: boolean;
};

const ROLE_VISIBILITY_CASES: RoleVisibilityCase[] = [
  { role: 'employee', expectTeamSections: false, expectPeriodOps: false },
  { role: 'manager', expectTeamSections: true, expectPeriodOps: false },
  { role: 'general_manager', expectTeamSections: true, expectPeriodOps: false },
  { role: 'director', expectTeamSections: true, expectPeriodOps: true },
  { role: 'hr', expectTeamSections: true, expectPeriodOps: true },
  { role: 'admin', expectTeamSections: true, expectPeriodOps: true },
];

test.describe('Leave Phase 2 Operations Visibility @leave @phase2', () => {
  for (const roleCase of ROLE_VISIBILITY_CASES) {
    test(`${roleCase.role} sees correct phase2 leave operations surfaces`, async ({ page }) => {
      test.skip(!getRoleCredentials(roleCase.role), `Missing ${roleCase.role} E2E credentials.`);

      await login(page, roleCase.role);
      await page.goto('/leave');
      await expect(page.getByRole('heading', { name: /Leave Management/i })).toBeVisible();

      const delegationHeading = page.getByRole('heading', { name: /Approval Delegations/i });
      const slaHeading = page.getByRole('heading', { name: /Approval SLA Monitor/i });
      const periodOpsSection = page.getByTestId('leave-period-ops-section');

      if (roleCase.expectTeamSections) {
        await expect(delegationHeading).toBeVisible();
        await expect(slaHeading).toBeVisible();
      } else {
        await expect(delegationHeading).toHaveCount(0);
        await expect(slaHeading).toHaveCount(0);
      }

      if (roleCase.expectPeriodOps) {
        await expect(periodOpsSection).toBeVisible();
        await expect(page.getByTestId('leave-period-start-input')).toBeVisible();
        await expect(page.getByTestId('leave-period-end-input')).toBeVisible();
        await expect(page.getByTestId('leave-period-dry-run-switch')).toBeVisible();
        await expect(page.getByTestId('leave-period-close-btn')).toBeVisible();
        await expect(page.getByTestId('leave-period-export-btn')).toBeVisible();
        await expect(page.getByTestId('leave-period-export-reconciliation')).toBeVisible();
      } else {
        await expect(periodOpsSection).toHaveCount(0);
      }
    });
  }
});
