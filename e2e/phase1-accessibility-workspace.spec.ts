import { expect, test } from '@playwright/test';

import { getRoleCredentials } from './helpers/rbac';

const fallbackAdminCredentials = {
  identifier: 'admin@flchrms.test',
  password: 'Test1234!',
};

function resolveAdminCredentials() {
  return getRoleCredentials('admin') ?? fallbackAdminCredentials;
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const creds = resolveAdminCredentials();

  await page.goto('/auth');
  await page.getByLabel('Email, Username, or Employee ID').fill(creds.identifier);
  await page.locator('#signin-password').fill(creds.password);
  await page.getByRole('button', { name: /^Sign In$/ }).click();

  await expect(page).toHaveURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });
}

test.describe.serial('Phase 1 - Accessibility workspace smoke @phase1 @a11y', () => {
  test('top bar utility controls meet minimum touch target size', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/employees');
    await expect(page.getByRole('heading', { name: /Employee Directory/i })).toBeVisible();

    const utilityControls = [
      page.getByRole('button', { name: /Switch to .* mode/i }),
      page.getByRole('button', { name: /Open notifications/i }),
      page.getByRole('button', { name: /^SA$/i }),
    ];

    for (const control of utilityControls) {
      const box = await control.boundingBox();
      expect(box, 'Expected utility control to have a measurable bounding box').not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('employee workspace keeps table rows semantic and returns focus after drawer close', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/employees');
    await expect(page.getByRole('heading', { name: /Employee Directory/i })).toBeVisible();

    await expect(page.locator('tbody tr[role="button"]')).toHaveCount(0);

    const openButton = page.getByRole('button', { name: /Open employee record for System Admin/i });
    const selectionCheckbox = page.getByRole('checkbox', { name: /Select System Admin/i });

    await selectionCheckbox.click();
    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('dialog', { name: /System Admin/i })).toHaveCount(0);

    await openButton.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/employeeId=.*employeeTab=profile/);
    await expect(page.getByRole('dialog', { name: /System Admin/i })).toBeVisible();

    await page.getByRole('button', { name: /^Close$/ }).click();
    await expect(page).toHaveURL(/\/employees$/);
    await expect(openButton).toBeFocused();
  });

  test('department workspace keeps table rows semantic and returns focus after drawer close', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/departments');
    await expect(page.getByRole('heading', { name: /Department Management/i })).toBeVisible();

    await expect(page.locator('tbody tr[role="button"]')).toHaveCount(0);

    const openButton = page.getByRole('button', { name: /Open department record for Operations/i });

    await openButton.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/departmentId=.*departmentTab=overview/);
    await expect(page.getByRole('dialog', { name: /Operations/i })).toBeVisible();

    await page.getByRole('button', { name: /^Close$/ }).click();
    await expect(page).toHaveURL(/\/departments$/);
    await expect(openButton).toBeFocused();
  });

  test('leave workspace returns focus to the detail trigger after drawer close', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/leave');
    await expect(page.getByRole('heading', { name: /Leave Management/i })).toBeVisible();

    const detailsButton = page.getByRole('button', { name: /^Details$/ }).nth(0);

    await detailsButton.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/requestId=.*tab=request/);
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /^Close$/ }).click();
    await expect(page).toHaveURL(/\/leave$/);
    await expect(detailsButton).toBeFocused();
  });
});
