import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeavePoliciesSection } from '@/components/admin/LeavePoliciesSection';
import { Tabs } from '@/components/ui/tabs';
import type { LeaveType } from '@/types/hrms';

const leaveTypes: LeaveType[] = [
  {
    id: 'leave-1',
    name: 'Annual Leave',
    description: 'Default paid leave policy.',
    days_allowed: 14,
    is_paid: true,
    min_days: 1,
    requires_document: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1' },
    role: 'admin',
  }),
}));

vi.mock('@/hooks/useLeaveBalance', () => ({
  useLeaveBalance: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useLeaveDisplayConfig', () => ({
  useLeaveDisplayPrefs: () => ({
    prefs: { visibleIds: ['leave-1'] },
    hiddenBalances: [],
    updatePrefs: vi.fn(),
    resetPrefs: vi.fn(),
  }),
}));

vi.mock('@/components/admin/LeaveWorkflowBuildersSection', () => ({
  LeaveWorkflowBuildersSection: () => null,
}));

vi.mock('@/components/admin/NotificationQueueOpsSection', () => ({
  NotificationQueueOpsSection: () => null,
}));

vi.mock('@/components/admin/WorkflowConfigAuditSection', () => ({
  WorkflowConfigAuditSection: () => null,
}));

vi.mock('@/components/admin/LeavePolicyAnalyticsSection', () => ({
  LeavePolicyAnalyticsSection: () => null,
}));

vi.mock('@/components/admin/LeaveBalanceAdjustmentsSection', () => ({
  LeaveBalanceAdjustmentsSection: () => null,
}));

vi.mock('@/components/leave/LeaveDisplayCustomizeDialog', () => ({
  LeaveDisplayCustomizeDialog: () => null,
}));

vi.mock('@/components/leave/LeaveDelegationsSection', () => ({
  LeaveDelegationsSection: () => null,
}));

vi.mock('@/components/leave/LeavePeriodOperationsSection', () => ({
  LeavePeriodOperationsSection: () => null,
}));

vi.mock('@/components/leave/LeaveSlaMonitorSection', () => ({
  LeaveSlaMonitorSection: () => null,
}));

function renderLeavePoliciesSection(canManageLeaveTypes: boolean) {
  return render(
    <Tabs defaultValue="leave-types">
      <LeavePoliciesSection
        leaveTypes={leaveTypes}
        leaveTypesLoading={false}
        canManageLeaveTypes={canManageLeaveTypes}
        onCreateLeaveType={vi.fn()}
        onEditLeaveType={vi.fn()}
        onDeleteLeaveType={vi.fn()}
      />
    </Tabs>,
  );
}

describe('LeavePoliciesSection', () => {
  it('keeps leave policy actions enabled for editable governance roles', () => {
    renderLeavePoliciesSection(true);

    expect(screen.getByRole('button', { name: /add leave type/i })).toBeEnabled();
    screen.getAllByRole('button', { name: /^edit$/i }).forEach((button) => {
      expect(button).toBeEnabled();
    });
    screen.getAllByRole('button', { name: /^delete$/i }).forEach((button) => {
      expect(button).toBeEnabled();
    });
  });

  it('shows disabled policy actions with a reason for read-only governance users', () => {
    renderLeavePoliciesSection(false);

    expect(screen.getByRole('button', { name: /add leave type/i })).toBeDisabled();
    screen.getAllByRole('button', { name: /^edit$/i }).forEach((button) => {
      expect(button).toBeDisabled();
    });
    screen.getAllByRole('button', { name: /^delete$/i }).forEach((button) => {
      expect(button).toBeDisabled();
    });
    expect(
      screen.getAllByLabelText('Requires leave policy edit permission').length,
    ).toBeGreaterThan(0);
  });
});
