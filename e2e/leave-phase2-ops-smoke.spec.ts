import { expect, test } from '@playwright/test';
import { getRoleCredentials, login } from './helpers/rbac';

test.describe('Leave Phase 2 Ops Smoke @leave @phase2', () => {
  test('manager can access delegation workspace controls', async ({ page }) => {
    test.skip(!getRoleCredentials('manager'), 'Missing manager E2E credentials.');

    await login(page, 'manager');
    await page.goto('/leave');

    await expect(page.getByRole('heading', { name: /Approval Delegations/i })).toBeVisible();
    await expect(page.getByLabel('Delegate User')).toBeVisible();
    await expect(page.getByLabel('Scope')).toBeVisible();
    await expect(page.getByLabel('Valid From')).toBeVisible();
    await expect(page.getByLabel('Valid To')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Delegation/i })).toBeVisible();
  });

  test('admin can run period ops dry-run close and export', async ({ page }) => {
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials.');

    await login(page, 'admin');
    await page.goto('/leave');

    await expect(page.getByTestId('leave-period-ops-section')).toBeVisible();
    await expect(page.getByTestId('leave-period-dry-run-switch')).toBeVisible();

    await page.getByTestId('leave-period-close-btn').click();
    await expect(page.getByTestId('leave-period-close-export-id')).toContainText(/dry-run|n\/a/i);

    await page.getByTestId('leave-period-export-btn').click();
    await expect(page.getByTestId('leave-period-export-id')).toContainText(/dry-run|n\/a/i);
  });
});
