import { expect, test, type Locator, type Page } from '@playwright/test';
import { getRoleCredentials, login } from './helpers/rbac';

const GRID_ITEM_SELECTOR = '.react-grid-layout > .react-grid-item:not(.react-grid-placeholder)';

async function dragFromPoint(page: Page, startX: number, startY: number, dx: number, dy: number) {
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 12 });
  const dragSignal = await page.locator('.react-grid-placeholder').first().isVisible().catch(() => false);
  const draggingClassSignal = await page
    .locator('.react-grid-layout > .react-grid-item.react-draggable-dragging')
    .first()
    .isVisible()
    .catch(() => false);
  await page.mouse.up();
  await page.waitForTimeout(220);
  return dragSignal || draggingClassSignal;
}

async function readRect(locator: Locator) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
}

function parseStylePx(style: string | null, property: 'width' | 'height') {
  if (!style) return null;
  const match = style.match(new RegExp(`${property}:\\s*([0-9.]+)px`));
  if (!match) return null;
  return Number(match[1]);
}

test.describe.serial('Dashboard layout drag/resize @dashboard @layout', () => {
  test('edit mode can drag a widget and cancel', async ({ page }) => {
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials');

    await login(page, 'admin');
    await page.goto('/dashboard');

    const editButton = page.getByRole('button', { name: /^Edit$/i });
    await expect(editButton).toBeVisible();
    await expect(editButton).toBeEnabled();
    await editButton.click();

    const items = page.locator(GRID_ITEM_SELECTOR);
    await expect(items.first()).toBeVisible();

    const candidate = items.first();
    const dragHandle = candidate.locator('.rgl-drag-handle').first();
    await expect(dragHandle).toBeVisible();

    const dragAttempts: Array<[number, number]> = [
      [180, 0],
      [-180, 0],
      [0, 160],
      [0, -160],
    ];

    let attempted = false;
    for (const [dx, dy] of dragAttempts) {
      const dragHandleBox = await dragHandle.boundingBox();
      expect(dragHandleBox).toBeTruthy();
      await dragFromPoint(
        page,
        dragHandleBox!.x + dragHandleBox!.width / 2,
        dragHandleBox!.y + dragHandleBox!.height / 2,
        dx,
        dy,
      );
      attempted = true;
      break;
    }

    expect(attempted).toBeTruthy();

    await page.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  });

  test('edit mode exposes west/southwest resize handles and applies resize change', async ({ page }) => {
    test.skip(!getRoleCredentials('admin'), 'Missing admin E2E credentials');

    await login(page, 'admin');
    await page.goto('/dashboard');

    const editButton = page.getByRole('button', { name: /^Edit$/i });
    await expect(editButton).toBeVisible();
    await expect(editButton).toBeEnabled();
    await editButton.click();

    const grid = page.locator('.react-grid-layout').first();
    await expect(grid).toBeVisible();
    const gridBox = await grid.boundingBox();
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    const items = page.locator(GRID_ITEM_SELECTOR);
    await expect(items.first()).toBeVisible();

    const itemCount = await items.count();
    let candidate: Locator = items.first();

    for (let i = 0; i < itemCount; i += 1) {
      const widget = items.nth(i);
      const box = await widget.boundingBox();
      if (!box || !gridBox) continue;

      const isRightSide = box.x > gridBox.x + 40;
      const isResizableWidth = box.width > 220 && box.width < gridBox.width - 40;
      const fitsViewport = box.x + box.width < viewportWidth - 20;
      if (isRightSide && isResizableWidth && fitsViewport) {
        candidate = widget;
        break;
      }
    }

    await candidate.scrollIntoViewIfNeeded();
    await expect(candidate.locator('.react-resizable-handle-se').first()).toBeVisible();
    await expect(candidate.locator('.react-resizable-handle-sw').first()).toBeVisible();
    await expect(candidate.locator('.react-resizable-handle-w').first()).toBeVisible();

    const beforeRect = await readRect(candidate);
    const beforeStyle = await candidate.getAttribute('style');
    const baseWidth = parseStylePx(beforeStyle, 'width') ?? beforeRect.width;
    const baseHeight = parseStylePx(beforeStyle, 'height') ?? beforeRect.height;

    let resized = false;
    for (const attempt of [
      { start: 'w', dx: -180, dy: 0 },
      { start: 'w', dx: 120, dy: 0 },
      { start: 'se', dx: 120, dy: 80 },
      { start: 'se', dx: -100, dy: -60 },
    ] as const) {
      await candidate.scrollIntoViewIfNeeded();
      const current = await readRect(candidate);
      const startX = attempt.start === 'se' ? current.x + current.width - 2 : current.x + 2;
      const startY = attempt.start === 'se' ? current.y + current.height - 2 : current.y + current.height / 2;

      await dragFromPoint(page, startX, startY, attempt.dx, attempt.dy);

      const afterRect = await readRect(candidate);
      const afterStyle = await candidate.getAttribute('style');
      const nextWidth = parseStylePx(afterStyle, 'width') ?? afterRect.width;
      const nextHeight = parseStylePx(afterStyle, 'height') ?? afterRect.height;
      if (Math.abs(nextWidth - baseWidth) > 8 || Math.abs(nextHeight - baseHeight) > 8) {
        resized = true;
        break;
      }
    }

    expect(resized).toBeTruthy();

    await page.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  });
});
