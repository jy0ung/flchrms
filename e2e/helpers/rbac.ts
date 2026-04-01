import { expect, Page } from '@playwright/test';

export type RbacRole = 'employee' | 'manager' | 'general_manager' | 'director' | 'hr' | 'admin';

export interface RoleCredentials {
  identifier: string;
  password: string;
}

export interface RbacE2EConfig {
  baseUrl: string;
  targetLeaveRowText?: string;
}

export type AdminLeavePolicyWorkspace =
  | 'leave-types'
  | 'operations'
  | 'workflow-builders'
  | 'balance-adjustments'
  | 'workflow-audit'
  | 'notification-queue'
  | 'analytics-simulation';

const leaveWorkspaceSelections = new WeakMap<Page, 'My Leave' | 'Team Leave'>();

function envName(role: RbacRole, field: 'IDENTIFIER' | 'PASSWORD') {
  return `E2E_${role.toUpperCase()}_${field}`;
}

export function getRoleCredentials(role: RbacRole): RoleCredentials | null {
  const identifier = process.env[envName(role, 'IDENTIFIER')]?.trim();
  const password = process.env[envName(role, 'PASSWORD')]?.trim();

  if (!identifier || !password) return null;
  return { identifier, password };
}

export function getRbacE2EConfig(): RbacE2EConfig {
  return {
    baseUrl: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173',
    targetLeaveRowText: process.env.E2E_PHASE3B_TARGET_LEAVE_ROW_TEXT?.trim() || undefined,
  };
}

export async function login(page: Page, role: RbacRole) {
  const creds = getRoleCredentials(role);
  if (!creds) throw new Error(`Missing credentials for role: ${role}`);

  await page.goto('/auth');

  const signInTab = page.getByRole('tab', { name: /^Sign In$/ });
  if (await signInTab.isVisible()) {
    await signInTab.click();
  }

  await page.getByLabel(/Email, username, or ID/i).fill(creds.identifier);
  await page.locator('#signin-password').fill(creds.password);
  await page.getByRole('button', { name: /^Sign In$/ }).click();

  await expect(page).toHaveURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });
}

export async function openLeavePage(page: Page) {
  await page.goto('/leave');
  await expect(page.getByRole('heading', { name: /Leave Management/i })).toBeVisible();
}

export async function openAdminPage(page: Page) {
  await page.goto('/admin');
  const adminHeadings = [
    page.getByRole('heading', { name: /Admin Dashboard/i }),
    page.getByRole('heading', { name: /Governance Hub/i }),
    page.getByRole('heading', { name: /HR Admin Dashboard/i }),
  ];

  for (const heading of adminHeadings) {
    if (await heading.isVisible().catch(() => false)) {
      return;
    }
  }

  const adminLink = page.getByRole('link', { name: /^(Governance|HR Admin|Admin)$/ });
  await expect(adminLink).toBeVisible({ timeout: 15_000 });
  await adminLink.click();

  let lastError: Error | null = null;
  for (const heading of adminHeadings) {
    try {
      await expect(heading).toBeVisible({ timeout: 15_000 });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Unable to open an admin governance page.');
}

export async function openCalendarPage(page: Page) {
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: /Team Calendar/i })).toBeVisible();
}

export async function openNotificationsPage(page: Page) {
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: /^Notifications$/i })).toBeVisible();
}

export async function openTopLeaveTab(page: Page, tabName: 'My Leave' | 'Team Leave') {
  leaveWorkspaceSelections.set(page, tabName);

  const legacyTab = page.getByRole('tab', { name: new RegExp(`^${tabName}`) });
  if (await legacyTab.count()) {
    await legacyTab.first().click();
    return;
  }

  const combinedDefault = tabName === 'My Leave' ? 'My Current' : 'Team Current';
  await page.getByRole('tab', { name: new RegExp(`^${combinedDefault}`) }).first().click();
}

export async function openVisibleLeaveSubtab(page: Page, tabName: 'Current' | 'History') {
  const topLevel = leaveWorkspaceSelections.get(page) ?? 'My Leave';
  const combinedTab = `${topLevel === 'My Leave' ? 'My' : 'Team'} ${tabName}`;

  const combinedLocator = page.getByRole('tab', { name: new RegExp(`^${combinedTab}`) });
  if (await combinedLocator.count()) {
    await combinedLocator.first().click();
    return;
  }

  await page.getByRole('tab', { name: new RegExp(`^${tabName}`) }).first().click();
}

export async function openAdminTab(page: Page, tabName: 'Employee Profiles' | 'Departments' | 'Role Management' | 'Leave Policies') {
  const routeByTab: Record<typeof tabName, string> = {
    'Employee Profiles': '/admin/employees',
    Departments: '/admin/departments',
    'Role Management': '/admin/roles',
    'Leave Policies': '/admin/leave-policies',
  };

  await page.goto(routeByTab[tabName]);
}

export async function openAdminLeavePoliciesWorkspace(
  page: Page,
  workspace: AdminLeavePolicyWorkspace,
) {
  await page.goto(`/admin/leave-policies?workspace=${workspace}`);
  await expect(page.getByRole('heading', { name: /Leave Policies/i })).toBeVisible();
}

export async function findDayCellWithLeaveEvent(page: Page) {
  const cells = page.locator('div.cursor-pointer');
  const count = await cells.count();

  for (let i = 0; i < count; i += 1) {
    const cell = cells.nth(i);
    if (!(await cell.isVisible())) continue;

    await cell.click();

    const leaveBadges = page.getByText(/^leave$/);
    if ((await leaveBadges.count()) > 0) {
      return cell;
    }
  }

  return null;
}

export async function findVisibleLeaveRowByAction(page: Page, actionLabel: string) {
  const rows = page.locator('table tbody tr');
  const count = await rows.count();

  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const actionButton = row.getByRole('button', { name: new RegExp(actionLabel) });
    if (await actionButton.count()) {
      if (await actionButton.first().isVisible()) {
        return row;
      }
    }
  }

  return null;
}

export async function findVisibleLeaveRow(page: Page, opts?: { text?: string; containsCancellation?: boolean }) {
  const rows = page.locator('table tbody tr');
  const count = await rows.count();

  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    if (!(await row.isVisible())) continue;

    const rowText = await row.innerText();
    if (opts?.text && !rowText.includes(opts.text)) continue;
    if (opts?.containsCancellation && !/Cancellation/i.test(rowText)) continue;

    return row;
  }

  return null;
}

export async function acceptPromptOrConfirm(page: Page, response?: string) {
  const dialogPromise = page.waitForEvent('dialog', { timeout: 10_000 });
  const dialog = await dialogPromise;
  await dialog.accept(response);
}
