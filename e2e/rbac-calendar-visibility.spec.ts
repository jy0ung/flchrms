import { expect, test } from '@playwright/test';
import {
  getRoleCredentials,
  login,
  openCalendarPage,
  RbacRole,
} from './helpers/rbac';

function hasCredentials(...roles: RbacRole[]) {
  return roles.every((role) => !!getRoleCredentials(role));
}

test.describe.serial('RBAC Phase 3B - Team Calendar Visibility @rbac @phase3b', () => {
  test('employee is redirected away from the team calendar route', async ({ page }) => {
    test.skip(!hasCredentials('employee'), 'Missing employee E2E credentials');

    await login(page, 'employee');
    await page.goto('/calendar');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening),/i })).toBeVisible();
  });

  test('manager can access Team Calendar and view leave details with leave type context', async ({ page }) => {
    test.skip(!hasCredentials('manager'), 'Missing manager E2E credentials');

    await login(page, 'manager');
    await openCalendarPage(page);

    const seededLeaveDay = page.getByRole('button', { name: /View events for April 15, 2026/i });
    await expect(seededLeaveDay).toBeVisible();
    await seededLeaveDay.click();

    await expect(page.getByText(/Annual Leave/i).first()).toBeVisible();
  });
});
