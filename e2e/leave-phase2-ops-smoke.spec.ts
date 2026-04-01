import { expect, test } from '@playwright/test';
import { getRoleCredentials, login, openAdminLeavePoliciesWorkspace } from './helpers/rbac';

test.describe('Leave Phase 2 Ops Smoke @leave @phase2', () => {
  test('manager does not see settings controls on leave page', async ({ page }) => {
    test.skip(!getRoleCredentials('manager'), 'Missing manager E2E credentials.');

    await login(page, 'manager');
    await page.goto('/leave');

    await expect(page.getByRole('heading', { name: /Approval Delegations/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Approval SLA Monitor/i })).toHaveCount(0);
    await expect(page.getByTestId('leave-period-ops-section')).toHaveCount(0);
  });

  test('admin can run period ops dry-run close and export under admin leave tab', async ({ page }) => {
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials.');

    await login(page, 'admin');
    await openAdminLeavePoliciesWorkspace(page, 'operations');

    await expect(page.getByTestId('leave-period-ops-section')).toBeVisible();
    await expect(page.getByTestId('leave-period-dry-run-switch')).toBeVisible();

    await page.getByTestId('leave-period-close-btn').click();
    await expect(page.getByTestId('leave-period-close-export-id')).toContainText(/dry-run|n\/a/i);

    await page.getByTestId('leave-period-export-btn').click();
    await expect(page.getByTestId('leave-period-export-id')).toContainText(/dry-run|n\/a/i);
  });
});
