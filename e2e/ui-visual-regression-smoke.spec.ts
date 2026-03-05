import { expect, test } from '@playwright/test';
import {
  getRoleCredentials,
  login,
  openAdminPage,
  openLeavePage,
  openNotificationsPage,
} from './helpers/rbac';

const runVisualSuite = process.env.E2E_VISUAL === '1';
const visualOptions = { fullPage: true, maxDiffPixels: 1500 };

test.describe.serial('UI visual regression smoke @visual', () => {
  test('captures dashboard baseline for admin', async ({ page }) => {
    test.skip(!runVisualSuite, 'Set E2E_VISUAL=1 to run visual baseline capture.');
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials.');

    await login(page, 'admin');
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening|night)/i })).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-admin.png', visualOptions);
  });

  test('captures leave baseline for admin', async ({ page }) => {
    test.skip(!runVisualSuite, 'Set E2E_VISUAL=1 to run visual baseline capture.');
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials.');

    await login(page, 'admin');
    await openLeavePage(page);
    await expect(page).toHaveScreenshot('leave-admin.png', visualOptions);
  });

  test('captures employees and admin surfaces baseline', async ({ page }) => {
    test.skip(!runVisualSuite, 'Set E2E_VISUAL=1 to run visual baseline capture.');
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials.');

    await login(page, 'admin');
    await page.goto('/employees');
    await expect(page.getByRole('heading', { name: /Employee Directory/i })).toBeVisible();
    await expect(page).toHaveScreenshot('employees-admin.png', visualOptions);

    await openAdminPage(page);
    await expect(page).toHaveScreenshot('admin-surface.png', visualOptions);
  });

  test('captures notifications baseline for admin', async ({ page }) => {
    test.skip(!runVisualSuite, 'Set E2E_VISUAL=1 to run visual baseline capture.');
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials.');

    await login(page, 'admin');
    await openNotificationsPage(page);
    await expect(page).toHaveScreenshot('notifications-admin.png', visualOptions);
  });
});
