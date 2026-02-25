import { expect, test } from '@playwright/test';
import {
  findVisibleLeaveRow,
  findVisibleLeaveRowByAction,
  getRbacE2EConfig,
  getRoleCredentials,
  login,
  openLeavePage,
  openTopLeaveTab,
  openVisibleLeaveSubtab,
  RbacRole,
} from './helpers/rbac';

const cfg = getRbacE2EConfig();

function hasCredentials(...roles: RbacRole[]) {
  return roles.every((role) => !!getRoleCredentials(role));
}

test.describe.serial('RBAC Phase 3B - Leave Cancellations @rbac @phase3b', () => {
  test('employee can request cancellation for final-approved leave', async ({ page }) => {
    test.skip(!hasCredentials('employee'), 'Missing employee E2E credentials');

    await login(page, 'employee');
    await openLeavePage(page);
    await openTopLeaveTab(page, 'My Leave');
    await openVisibleLeaveSubtab(page, 'History');

    const row =
      (await findVisibleLeaveRow(page, { text: cfg.targetLeaveRowText })) ||
      (await findVisibleLeaveRowByAction(page, 'Request Cancellation'));

    test.skip(!row, 'No eligible approved leave row with "Request Cancellation" button found in My Leave history.');

    const requestButton = row!.getByRole('button', { name: /Request Cancellation/i });
    test.skip(!(await requestButton.isVisible()), 'Selected row is not eligible for cancellation request.');

    await requestButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page
      .getByPlaceholder(/Explain why you are requesting cancellation/i)
      .fill('E2E cancellation request reason');
    await page.getByRole('button', { name: /Submit Cancellation Request/i }).click();

    await expect(page.getByText(/Leave cancellation request submitted/i)).toBeVisible();
    await openVisibleLeaveSubtab(page, 'Current');
    await expect(page.getByText(/Cancel req: E2E cancellation request reason/i)).toBeVisible();
    await expect(page.getByText(/Cancellation Pending/i).first()).toBeVisible();
  });

  test('manager can view leave details and sees cancellation action controls', async ({ page }) => {
    test.skip(!hasCredentials('manager'), 'Missing manager E2E credentials');

    await login(page, 'manager');
    await openLeavePage(page);
    await openTopLeaveTab(page, 'Team Leave');
    await openVisibleLeaveSubtab(page, 'Current');

    const row =
      (await findVisibleLeaveRow(page, {
        text: cfg.targetLeaveRowText,
        containsCancellation: true,
      })) ||
      (await findVisibleLeaveRowByAction(page, 'Approve Cancel'));

    test.skip(!row, 'No team leave row with pending cancellation found for manager.');

    await expect(row!).toContainText(/Cancellation Pending/i);
    await expect(row!.getByRole('button', { name: /Approve Cancel/i })).toBeVisible();
    await expect(row!.getByRole('button', { name: /Reject Cancel/i })).toBeVisible();

    await row!.getByRole('button', { name: /Details/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Leave Request Details')).toBeVisible();
    await expect(page.getByText('Approval Timeline')).toBeVisible();
    await expect(page.getByText('Cancellation Timeline')).toBeVisible();
  });

  test('HR can view leave details but cannot approve/reject cancellation', async ({ page }) => {
    test.skip(!hasCredentials('hr'), 'Missing HR E2E credentials');

    await login(page, 'hr');
    await openLeavePage(page);
    await openTopLeaveTab(page, 'Team Leave');

    // Prefer current tab for pending cancellation requests, but fallback to history for details-only coverage.
    await openVisibleLeaveSubtab(page, 'Current');

    let row =
      (await findVisibleLeaveRow(page, {
        text: cfg.targetLeaveRowText,
        containsCancellation: true,
      })) ||
      (await findVisibleLeaveRow(page, { containsCancellation: true }));

    if (!row) {
      await openVisibleLeaveSubtab(page, 'History');
      row =
        (await findVisibleLeaveRow(page, {
          text: cfg.targetLeaveRowText,
          containsCancellation: true,
        })) ||
        (await findVisibleLeaveRow(page, { containsCancellation: true }));
    }

    test.skip(!row, 'No leave row with cancellation history found for HR details-view test.');

    await expect(row!.getByRole('button', { name: /Approve Cancel/i })).toHaveCount(0);
    await expect(row!.getByRole('button', { name: /Reject Cancel/i })).toHaveCount(0);
    await expect(row!.getByRole('button', { name: /Details/i })).toBeVisible();

    await row!.getByRole('button', { name: /Details/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Leave Request Details')).toBeVisible();
    await expect(page.getByText('Approval Timeline')).toBeVisible();
  });
});
