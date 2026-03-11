import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { getRoleCredentials } from './helpers/rbac';

const fallbackCreds = {
  admin: { identifier: 'admin@flchrms.test', password: 'Test1234!' },
  employee: { identifier: 'employee@flchrms.test', password: 'Test1234!' },
};

function resolveCreds(role: 'admin' | 'employee') {
  return getRoleCredentials(role) ?? fallbackCreds[role];
}

async function signIn(page: Page, role: 'admin' | 'employee', target: string) {
  const creds = resolveCreds(role);

  await page.goto(`/auth?redirect=${encodeURIComponent(target)}`);
  await page.getByLabel('Email, Username, or Employee ID').fill(creds.identifier);
  await page.locator('#signin-password').fill(creds.password);
  await page.getByRole('button', { name: /^Sign In$/ }).click();
  await expect(page).toHaveURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });
}

function formatViolations(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  - ${node.target.join(', ')} :: ${node.failureSummary ?? 'no failure summary'}`)
        .join('\n');
      return `${violation.id} (${violation.impact})\n${nodes}`;
    })
    .join('\n\n');
}

async function expectNoSeriousAxeViolations(page: Page, routeLabel: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .include('body')
    .exclude('[data-sonner-toaster]')
    .analyze();

  const seriousViolations = results.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical',
  );

  expect(
    seriousViolations,
    `${routeLabel} has serious/critical accessibility violations:\n${formatViolations(seriousViolations)}`,
  ).toEqual([]);
}

test.describe.serial('Phase 4 - Axe smoke @phase4 @a11y', () => {
  test('employee-facing core routes have no serious or critical accessibility violations', async ({ page }) => {
    await signIn(page, 'employee', '/dashboard');

    await expect(page.getByText(/Operational Status/i)).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Employee dashboard');

    await page.goto('/leave');
    await expect(page.getByRole('heading', { name: /Leave Management/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Leave workspace');

    await page.goto('/payroll');
    await expect(page.getByRole('heading', { name: /^Payroll$/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Payroll workspace');

    await page.goto('/attendance');
    await expect(page.getByRole('heading', { name: /^Attendance$/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Attendance workspace');

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Notifications workspace');

    await page.goto('/training');
    await expect(page.getByRole('heading', { name: /Training & Development/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Training workspace');

    await page.goto('/announcements');
    await expect(page.getByRole('heading', { name: /Announcements/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Announcements workspace');
  });

  test('admin-facing operational routes have no serious or critical accessibility violations', async ({ page }) => {
    await signIn(page, 'admin', '/employees');

    await expect(page.getByRole('heading', { name: /Employee Directory/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Employee directory');

    await page.goto('/departments');
    await expect(page.getByRole('heading', { name: /Department Management/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Department workspace');

    await page.goto('/dashboard');
    await expect(page.getByText(/Alerts/i)).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Admin dashboard');

    await page.goto('/documents');
    await expect(page.getByRole('heading', { name: /Document Management/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Documents workspace');

    await page.goto('/performance');
    await expect(page.getByRole('heading', { name: /Performance Reviews/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Performance workspace');
  });

  test('governance routes have no serious or critical accessibility violations', async ({ page }) => {
    await signIn(page, 'admin', '/admin/quick-actions');

    await expect(page.getByRole('heading', { name: /Governance Hub/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Governance hub');

    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Governance dashboard');

    await page.goto('/admin/announcements');
    await expect(page.getByRole('heading', { name: /Announcement Management/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Governance announcements');

    await page.goto('/admin/audit-log');
    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible();
    await expectNoSeriousAxeViolations(page, 'Governance audit log');
  });
});
