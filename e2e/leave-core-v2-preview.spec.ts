import { expect, test } from '@playwright/test';
import { getRoleCredentials, login, openLeavePage } from './helpers/rbac';

function offsetIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

test.describe.serial('Leave Core V2 Preview @leave @phase1', () => {
  test('request wizard runs server policy preview before submit', async ({ page }) => {
    test.skip(!getRoleCredentials('employee'), 'Missing employee E2E credentials');

    await login(page, 'employee');
    await openLeavePage(page);

    await page.getByRole('button', { name: /^Request Leave$/i }).click();
    await expect(page.getByRole('heading', { name: /New Leave Request/i })).toBeVisible();

    const leaveTypeCards = page.locator('[data-testid^="leave-type-card-"]');
    await expect(leaveTypeCards.first()).toBeVisible();

    const cardCount = await leaveTypeCards.count();
    let selected = false;
    for (let i = 0; i < cardCount; i += 1) {
      const card = leaveTypeCards.nth(i);
      if ((await card.getByText(/Doc required/i).count()) === 0) {
        await card.click();
        selected = true;
        break;
      }
    }
    if (!selected) {
      await leaveTypeCards.first().click();
    }

    await page.getByTestId('leave-wizard-next').click();

    const requestDate = offsetIsoDate(21);
    await page.getByTestId('leave-start-date-input').fill(requestDate);
    await page.getByTestId('leave-end-date-input').fill(requestDate);
    await page.getByTestId('leave-wizard-next').click();

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles({
        name: 'leave-proof.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('phase1 preview test'),
      });
    }

    const previewResponsePromise = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes('/rest/v1/rpc/leave_preview_request')
      );
    });

    await page.getByTestId('leave-wizard-next').click();

    const previewResponse = await previewResponsePromise;
    expect(previewResponse.status()).toBe(200);
    await expect(page.getByTestId('leave-policy-preview-panel')).toBeVisible();
    await expect(page.getByText(/Policy Preview/i)).toBeVisible();
  });
});
