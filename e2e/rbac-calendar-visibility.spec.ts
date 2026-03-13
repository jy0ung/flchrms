import { expect, test, type Page } from '@playwright/test';
import {
  findDayCellWithLeaveEvent,
  getRoleCredentials,
  login,
  openCalendarPage,
  RbacRole,
} from './helpers/rbac';

function hasCredentials(...roles: RbacRole[]) {
  return roles.every((role) => !!getRoleCredentials(role));
}

async function selectAnyVisibleLeaveDayOrSkip(page: Page) {
  const dayCell = await findDayCellWithLeaveEvent(page);
  test.skip(!dayCell, 'No leave events visible in the current calendar month for this environment.');
  await expect(page.getByText(/^leave$/).first()).toBeVisible();
}

test.describe.serial('RBAC Phase 3B - Team Calendar Visibility @rbac @phase3b', () => {
  test('employee can access Team Calendar and view leave presence without leave type label', async ({ page }) => {
    test.skip(!hasCredentials('employee'), 'Missing employee E2E credentials');

    await login(page, 'employee');
    await openCalendarPage(page);

    await selectAnyVisibleLeaveDayOrSkip(page);

    await expect(page.getByText(/^Leave type:/)).toHaveCount(0);
  });

  test('manager can access Team Calendar and view leave type label in leave details', async ({ page }) => {
    test.skip(!hasCredentials('manager'), 'Missing manager E2E credentials');

    await login(page, 'manager');
    await openCalendarPage(page);

    await selectAnyVisibleLeaveDayOrSkip(page);

    await expect(page.getByText(/^Leave type:/)).toBeVisible();
  });
});
