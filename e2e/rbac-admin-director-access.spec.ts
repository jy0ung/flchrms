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
  test('director can access governance leave policies and see department workflow builders', async ({ page }) => {
    test.skip(!hasCredentials('director'), 'Missing director E2E credentials');

    await login(page, 'director');
    await expect(page.getByRole('link', { name: /^Governance$/ })).toBeVisible();
    await openAdminPage(page);
    await expect(page).toHaveURL(/\/admin(\/.*)?$/);

    await openAdminTab(page, 'Leave Policies');
    await page.getByRole('tab', { name: /^Workflow Builders$/i }).click();

    await expect(page.getByText('Leave Approval Workflow Builder')).toBeVisible();
    await expect(page.getByText('Leave Cancellation Workflow Builder')).toBeVisible();
    await expect(page.getByText('Department Scope').first()).toBeVisible();
    await expect(page.getByText('All Departments (Default)').first()).toBeVisible();

    // Requester-role profile selectors were removed in the department-based revamp.
    await expect(page.getByText('Workflow Profile (Requester Role)')).toHaveCount(0);
    await expect(page.getByText('Save As Profile (Copy To Role)')).toHaveCount(0);
  });

  test('admin entry route defaults to the governance dashboard', async ({ page }) => {
    test.skip(!hasCredentials('admin'), 'Missing admin E2E credentials');

    await login(page, 'admin');
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();
  });

  test('admin can open the employee profile editor from the employee workspace', async ({ page }) => {
    test.skip(!hasCredentials('admin'), 'Missing admin E2E credentials');

    await login(page, 'admin');
    await openAdminTab(page, 'Employee Profiles');
    await expect(page.getByRole('heading', { name: /Employee Directory/i })).toBeVisible();

    const employeeRow = page.getByRole('row', { name: /Evan Employee/i });
    await expect(employeeRow).toBeVisible();
    await employeeRow.getByRole('button', { name: /Open employee record for Evan Employee/i }).click();
    await expect(page.getByText('Workspace actions')).toBeVisible();

    const editEmployeeButton = page.getByRole('button', { name: /^Edit Employee$/i });
    await expect(editEmployeeButton).toBeVisible();
    await editEmployeeButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Edit Employee Profile')).toBeVisible();
    await expect(page.getByText(/Update profile information for Evan Employee/i)).toBeVisible();
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('Employee ID')).toBeVisible();
    await expect(page.getByLabel('Username Alias (Optional)')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible();
  });
});
