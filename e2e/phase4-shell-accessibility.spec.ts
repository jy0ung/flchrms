import { expect, test } from '@playwright/test';

const fallbackCreds = {
  admin: { identifier: 'admin@flchrms.test', password: 'Test1234!' },
  employee: { identifier: 'employee@flchrms.test', password: 'Test1234!' },
  manager: { identifier: 'manager@flchrms.test', password: 'Test1234!' },
};

async function signIn(page: import('@playwright/test').Page, creds: { identifier: string; password: string }, target = '/dashboard') {
  await page.goto(`/auth?redirect=${encodeURIComponent(target)}`);
  await page.getByLabel('Email, Username, or Employee ID').fill(creds.identifier);
  await page.locator('#signin-password').fill(creds.password);
  await page.getByRole('button', { name: /^Sign In$/ }).click();
  await expect(page).toHaveURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });
}

test.describe.serial('Phase 4 - Shell accessibility smoke @phase4 @a11y', () => {
  test('mobile app shell keeps bottom-nav touch targets at 44px or above for employee routes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, fallbackCreds.employee, '/dashboard');

    const navTargets = [
      page.getByRole('link', { name: /^Dashboard$/i }),
      page.getByRole('link', { name: /^Leave$/i }),
      page.getByRole('link', { name: /^Payroll$/i }),
      page.getByRole('link', { name: /^Notifications$/i }),
      page.getByRole('button', { name: /More navigation/i }),
    ];

    for (const control of navTargets) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('mobile bottom nav swaps the third slot to employees for manager roles', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, fallbackCreds.manager, '/dashboard');

    await expect(page.getByRole('link', { name: /^Employees$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Payroll$/i })).toHaveCount(0);
  });

  test('governance shell exposes a skip link for keyboard users', async ({ page }) => {
    await signIn(page, fallbackCreds.admin, '/admin/dashboard');

    const skipLink = page.getByRole('link', { name: /Skip to governance content/i });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('#admin-main-content')).toBeFocused();
  });
});
