import { expect, test } from '@playwright/test';
import { getRoleCredentials, login } from './helpers/rbac';

test.describe('Leave Phase 3 Analytics Smoke @leave @phase3', () => {
  test('admin can open analytics tab and run dry-run forecast/simulation', async ({ page }) => {
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials.');

    await login(page, 'admin');
    await page.goto('/admin/leave-policies');

    await expect(page.getByRole('heading', { name: /Leave Policies/i })).toBeVisible();

    await page.getByRole('tab', { name: /^Analytics$/ }).click();
    await expect(page.getByText('Run Controls')).toBeVisible();
    await expect(page.getByLabel('As Of Date')).toBeVisible();
    await expect(page.getByLabel('Horizon (Months)')).toBeVisible();
    await expect(page.getByLabel('Country Code')).toBeVisible();
    await expect(page.getByRole('button', { name: /Run Forecast/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Run Policy Simulation/i })).toBeVisible();

    const forecastResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/rest/v1/rpc/leave_run_forecast') && response.status() === 200,
    );
    await page.getByRole('button', { name: /Run Forecast/i }).click();
    await forecastResponsePromise;

    const policySimResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/rest/v1/rpc/leave_simulate_policy_change') &&
        response.status() === 200,
    );
    await page.getByRole('button', { name: /Run Policy Simulation/i }).click();
    await policySimResponsePromise;
  });

  test('manager is redirected when attempting to access admin leave policies directly', async ({
    page,
  }) => {
    test.skip(!getRoleCredentials('manager'), 'Missing manager E2E credentials.');

    await login(page, 'manager');
    await page.goto('/admin/leave-policies');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
