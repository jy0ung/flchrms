import { expect, test } from '@playwright/test';
import {
  getRoleCredentials,
  login,
  openAdminPage,
  openAdminTab,
  RbacRole,
} from './helpers/rbac';

function hasCredentials(...roles: RbacRole[]) {
  return roles.every((role) => !!getRoleCredentials(role));
}

test.describe.serial('RBAC Phase 3B - Admin & Director Access @rbac @phase3b', () => {
  test('director can access HR Admin and see department workflow builders', async ({ page }) => {
    test.skip(!hasCredentials('director'), 'Missing director E2E credentials');

    await login(page, 'director');

    await expect(page.getByRole('link', { name: /^HR Admin$/ })).toBeVisible();
    await page.getByRole('link', { name: /^HR Admin$/ }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /HR Admin Dashboard/i })).toBeVisible();

    await openAdminTab(page, 'Leave Policies');

    await expect(page.getByText('Leave Approval Workflow Builder')).toBeVisible();
    await expect(page.getByText('Leave Cancellation Workflow Builder')).toBeVisible();
    await expect(page.getByText('Department Scope').first()).toBeVisible();
    await expect(page.getByText('All Departments (Default)').first()).toBeVisible();

    // Requester-role profile selectors were removed in the department-based revamp.
    await expect(page.getByText('Workflow Profile (Requester Role)')).toHaveCount(0);
    await expect(page.getByText('Save As Profile (Copy To Role)')).toHaveCount(0);
  });

  test('admin defaults to Role Management tab on HR Admin page', async ({ page }) => {
    test.skip(!hasCredentials('admin'), 'Missing admin E2E credentials');

    await login(page, 'admin');
    await openAdminPage(page);

    const roleTab = page.getByRole('tab', { name: /^Role Management$/ });
    await expect(roleTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Role Management').nth(1)).toBeVisible();
  });

  test('admin employee profile dialog is account-limited (username alias only)', async ({ page }) => {
    test.skip(!hasCredentials('admin'), 'Missing admin E2E credentials');

    await login(page, 'admin');
    await openAdminPage(page);

    const employeeTab = page.getByRole('tab', { name: /^Employee Profiles$/ });
    await employeeTab.click();

    const editButtons = page.getByTitle('Edit username alias');
    const editButtonCount = await editButtons.count();
    test.skip(editButtonCount === 0, 'No employee rows available for admin account editor test.');

    await editButtons.first().click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Manage Account Access')).toBeVisible();
    await expect(page.getByText(/Admin access is limited to account-level username alias management/i)).toBeVisible();
    await expect(page.getByLabel('Username Alias (Optional)')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Username Alias/i })).toBeVisible();

    // Full employee profile fields should not render for admin-limited mode.
    await expect(page.getByLabel('First Name')).toHaveCount(0);
    await expect(page.getByLabel('Last Name')).toHaveCount(0);
    await expect(page.getByLabel('Employee ID')).toHaveCount(0);
  });
});
