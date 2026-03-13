import { expect, test } from '@playwright/test';
import {
  getRoleCredentials,
  login,
  openAdminPage,
  openAdminTab,
  openNotificationsPage,
  type RbacRole,
} from './helpers/rbac';

function hasCredentials(...roles: RbacRole[]) {
  return roles.every((role) => !!getRoleCredentials(role));
}

test.describe.serial('Phase 7 - Notifications @phase7 @notifications', () => {
  test('employee can view notifications history and mark a read notification unread', async ({ page }) => {
    test.skip(!hasCredentials('employee'), 'Missing employee E2E credentials');

    await login(page, 'employee');
    await openNotificationsPage(page);

    await expect(page.getByText(/Notification History/i)).toBeVisible();
    await expect(page.getByText('Phase 7 Read Notification')).toBeVisible();

    const fixtureRow = page
      .locator('div.rounded-lg.border.p-4')
      .filter({ has: page.getByText('Phase 7 Read Notification', { exact: true }) })
      .first();

    await expect(fixtureRow).toBeVisible();

    const markUnreadButton = fixtureRow.getByRole('button', { name: /Mark unread/i });
    const markReadButton = fixtureRow.getByRole('button', { name: /Mark read/i });

    if (await markUnreadButton.isVisible().catch(() => false)) {
      await markUnreadButton.click();
    } else {
      await expect(markReadButton).toBeVisible();
      await markReadButton.click();
      await expect(markUnreadButton).toBeVisible();
      await markUnreadButton.click();
    }

    await expect(fixtureRow.getByText(/^Unread$/)).toBeVisible();
    await expect(fixtureRow.getByRole('button', { name: /Mark read/i })).toBeVisible();
  });

  test('admin can view workflow config notifications and audit activity in HR Admin', async ({ page }) => {
    test.skip(!hasCredentials('admin'), 'Missing admin E2E credentials');

    await login(page, 'admin');
    await openNotificationsPage(page);

    await expect(page.getByText(/Notification History/i)).toBeVisible();
    await expect(page.getByText(/Workflow Config/i).first()).toBeVisible();

    await openAdminPage(page);
    await openAdminTab(page, 'Leave Policies');
    await page.getByRole('tab', { name: /^Workflow Audit$/i }).click();

    await expect(page.getByText('Workflow Configuration Activity')).toBeVisible();
    await expect(page.getByText(/Notes updated|Workflow settings updated|Route changed/i).first()).toBeVisible();
  });
});
